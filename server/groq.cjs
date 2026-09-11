'use strict';
const DISABLED_TTL_MS=5*60*1000;
function createProviderState(){return {cooldownUntil:0,disabledUntil:new Map()}}
const defaultProviderState=createProviderState();

class ProviderError extends Error{
  constructor(message,status=503,retryAfter=0,details={}){
    super(message);
    this.name='ProviderError';
    this.status=status;
    this.retryAfter=retryAfter;
    this.providerStatus=details.providerStatus||0;
    this.providerCode=details.providerCode||'';
    this.providerType=details.providerType||'';
    this.providerMessage=details.providerMessage||'';
    this.model=details.model||'';
    this.stage=details.stage||'';
    this.causeCode=details.causeCode||'';
  }
}

function keys(env=process.env){
  let result;
  try{result=JSON.parse(env.GROQ_API_KEYS||'[]')}
  catch{result=(env.GROQ_API_KEYS||'').split(/[\s,]+/)}
  if(!Array.isArray(result))result=[];
  if(env.GROQ_API_KEY)result.unshift(env.GROQ_API_KEY);
  return [...new Set(result.filter(key=>typeof key==='string'&&key.startsWith('gsk_')))];
}

function retrySeconds(value,now){
  const numeric=Number(value);
  if(value!==null&&value!==''&&Number.isFinite(numeric))return Math.max(1,Math.ceil(numeric));
  const date=Date.parse(value);
  return Number.isFinite(date)?Math.max(1,Math.ceil((date-now)/1000)):60;
}

function clean(value,max=320){
  return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
}

function pruneDisabled(state,now){
  for(const [key,until] of state.disabledUntil)if(until<=now)state.disabledUntil.delete(key);
}

async function providerDetails(response,model,stage){
  let payload=null,causeCode='provider_error';
  try{if(typeof response.json==='function')payload=await response.json()}catch{causeCode='unreadable_error_body'}
  if(payload===null&&typeof response.text==='function'){
    try{const raw=await response.text();if(raw)payload={error:{message:raw}}}catch{causeCode='unreadable_error_body'}
  }
  const error=payload&&typeof payload==='object'?(payload.error&&typeof payload.error==='object'?payload.error:payload):{};
  return {
    providerStatus:response.status||0,
    providerCode:clean(error.code,120),
    providerType:clean(error.type,120),
    providerMessage:clean(error.message,320),
    model,
    stage,
    causeCode
  };
}

function structuredOutputFailure(details){
  const haystack=`${details.providerCode} ${details.providerType} ${details.providerMessage}`.toLowerCase();
  return details.providerStatus===400&&/(json|schema|response[_ -]?format|failed[_ -]?generation|structured)/.test(haystack);
}

function publicFailure(details){
  if(['invalid_model_output','output_truncated','empty_model_output','invalid_json_output'].includes(details.providerCode))return new ProviderError('The dungeon master returned an incomplete turn. Nothing has been changed.',502,0,details);
  if(details.providerStatus===401)return new ProviderError('The dungeon master credential was rejected. Your save is unchanged.',503,0,details);
  if(details.providerStatus===403)return new ProviderError('The configured Groq project does not permit an available dungeon-master model. Your save is unchanged.',502,0,details);
  if([400,404,413,422].includes(details.providerStatus))return new ProviderError('Groq rejected the dungeon-master request. Your save is unchanged.',502,0,details);
  if(details.providerStatus>=500||details.providerStatus===498)return new ProviderError('Groq is temporarily unavailable. Your progress is safe.',503,0,details);
  if(details.providerStatus===0)return new ProviderError('The dungeon master lost connection to Groq. Please try the same action again.',503,0,details);
  return new ProviderError('Groq could not complete the dungeon-master request. Your save is unchanged.',502,0,details);
}

function requestBody(model,messages,schema,strict=true,stage='turn'){
  return {
    model,
    messages,
    temperature:stage==='plan'?.2:.75,
    max_completion_tokens:stage==='plan'?1200:3200,
    reasoning_effort:'low',
    response_format:strict
      ?{type:'json_schema',json_schema:{name:'adventure_turn',strict:true,schema}}
      :{type:'json_object'}
  };
}

async function request(key,model,messages,schema,{fetcher,now,deadline,stage,strict=true}){
  const remaining=deadline-now();
  if(remaining<1000)return {response:null,failure:{providerStatus:0,providerCode:'deadline_exhausted',causeCode:'deadline',model,stage}};
  try{
    const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      signal:AbortSignal.timeout(Math.min(16000,remaining)),
      headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify(requestBody(model,messages,schema,strict,stage))
    });
    return {response,failure:null};
  }catch(error){
    const timeout=error?.name==='TimeoutError'||error?.name==='AbortError';
    return {response:null,failure:{providerStatus:0,providerCode:timeout?'network_timeout':'network_error',causeCode:timeout?'timeout':'network',model,stage}};
  }
}

async function parseSuccess(response,model,stage){
  let data;
  try{data=await response.json()}catch{throw new ProviderError('The dungeon master returned an incomplete turn. Nothing has been changed.',502,0,{providerStatus:response.status||200,providerCode:'invalid_json_output',causeCode:'invalid_response_json',model,stage})}
  if(data.choices?.[0]?.finish_reason==='length')throw new ProviderError('The dungeon master returned an incomplete turn. Nothing has been changed.',502,0,{providerStatus:response.status||200,providerCode:'output_truncated',causeCode:'token_limit',model,stage});
  const content=data.choices?.[0]?.message?.content;
  if(typeof content!=='string'||!content.trim())throw new ProviderError('The dungeon master returned an incomplete turn. Nothing has been changed.',502,0,{providerStatus:response.status||200,providerCode:'empty_model_output',causeCode:'empty_output',model,stage});
  try{return JSON.parse(content)}catch{throw new ProviderError('The dungeon master returned an incomplete turn. Nothing has been changed.',502,0,{providerStatus:response.status||200,providerCode:'invalid_json_output',causeCode:'model_json_parse',model,stage})}
}

async function parseOrRemember(response,model,stage){
  try{return {value:await parseSuccess(response,model,stage),failure:null}}
  catch(error){return {value:null,failure:{providerStatus:error.providerStatus||response.status||200,providerCode:error.providerCode||'invalid_model_output',providerType:error.providerType||'',providerMessage:error.providerMessage||'',causeCode:error.causeCode||'invalid_output',model,stage}}}
}

function recordRateLimit(state,response,model,stage,now){
  const seconds=retrySeconds(response.headers?.get?.('retry-after'),now());
  // Groq rate limits have an organisation ceiling, so changing credentials does not bypass a 429.
  state.cooldownUntil=now()+seconds*1000;
  throw new ProviderError('Groq is rate-limited right now. Your action has not been applied.',429,seconds,{providerStatus:429,providerCode:'rate_limit',causeCode:'rate_limit',model,stage});
}

async function generate(messages,schema,{env=process.env,fetcher=fetch,now=Date.now,stage='turn',providerState=defaultProviderState}={}){
  const pool=keys(env);
  if(!pool.length)throw new ProviderError('The dungeon master is not configured yet.',503);
  const current=now();pruneDisabled(providerState,current);
  if(providerState.cooldownUntil>current)throw new ProviderError('Groq is rate-limited right now. Your action has not been applied.',429,Math.max(1,Math.ceil((providerState.cooldownUntil-current)/1000)),{providerStatus:429,providerCode:'rate_limit',causeCode:'rate_limit',stage});

  const models=[...new Set([env.GROQ_MODEL||'openai/gpt-oss-120b',env.GROQ_FALLBACK_MODEL||'openai/gpt-oss-20b'].filter(Boolean))];
  const deadline=now()+35000;
  let lastFailure=null;

  // Credentials are tried in configured order for availability failover. A provider 429 is
  // organisation-scoped and is respected rather than bypassed by hopping credentials.
  for(const key of pool){
    if((providerState.disabledUntil.get(key)||0)>now())continue;
    let tryNextCredential=false;
    let stopAfterCredential=false;

    for(const model of models){
      const attempt=await request(key,model,messages,schema,{fetcher,now,deadline,stage,strict:true});
      if(!attempt.response){lastFailure=attempt.failure;tryNextCredential=true;continue}
      let response=attempt.response;

      if(response.status===429)recordRateLimit(providerState,response,model,stage,now);
      if(response.status===401){
        providerState.disabledUntil.set(key,now()+DISABLED_TTL_MS);
        lastFailure=await providerDetails(response,model,stage);
        tryNextCredential=true;
        break;
      }

      if(response.ok){
        const parsed=await parseOrRemember(response,model,stage);
        if(parsed.failure){lastFailure=parsed.failure;continue}
        return parsed.value;
      }

      let details=await providerDetails(response,model,stage);
      lastFailure=details;

      // Retry structured-output request errors once using JSON Object mode. The world layer
      // still validates every field before a save can change.
      if(structuredOutputFailure(details)){
        const compatibilityAttempt=await request(key,model,messages,schema,{fetcher,now,deadline,stage,strict:false});
        if(!compatibilityAttempt.response){lastFailure=compatibilityAttempt.failure;tryNextCredential=true;continue}
        response=compatibilityAttempt.response;
        if(response.status===429)recordRateLimit(providerState,response,model,stage,now);
        if(response.status===401){
          providerState.disabledUntil.set(key,now()+DISABLED_TTL_MS);
          lastFailure=await providerDetails(response,model,stage);
          tryNextCredential=true;
          break;
        }
        if(response.ok){
          const parsed=await parseOrRemember(response,model,stage);
          if(parsed.failure){lastFailure=parsed.failure;continue}
          return parsed.value;
        }
        details=await providerDetails(response,model,stage);
        lastFailure=details;
      }

      if(details.providerStatus===403||details.providerStatus>=500||details.providerStatus===498){tryNextCredential=true;continue}
      if([400,404,413,422].includes(details.providerStatus)){stopAfterCredential=true;continue}
      throw publicFailure(details);
    }

    if(stopAfterCredential&&!tryNextCredential)break;
  }

  if(lastFailure)throw publicFailure(lastFailure);
  throw new ProviderError('No valid dungeon-master credential is available. Your save is unchanged.',503);
}

function resetForTests(){defaultProviderState.cooldownUntil=0;defaultProviderState.disabledUntil.clear()}
module.exports={generate,keys,ProviderError,createProviderState,resetForTests};
