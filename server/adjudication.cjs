'use strict';
const kinds=new Set(['none','check','attack','save']);
const abilities=new Set(['STR','DEX','CON','INT','WIS','CHA']);
const resources=new Set(['none','spell','potion','secondWind']);
const advantages=new Set(['normal','advantage','disadvantage']);
const informationRequest=/^(?:i\s+)?(?:(?:ask|question|speak\s+to|talk\s+to)\b[\s\S]{0,180}\b(?:about|what|where|when|who|why|how|whether)\b|(?:tell|explain|describe)\b)/i;
const directQuestion=/^(?:what|where|when|who|why|how|is|are|did|does|do|can|could|would)\b/i;
const influenceAttempt=/\b(?:persuad\w*|convinc\w*|deceiv\w*|lie\b|bluff\w*|intimidat\w*|threaten\w*|coerc\w*|brib\w*|charm\w*|pressure\w*|demand\w*|force\w*|trick\w*)\b/i;

function validPlan(plan){
  return !!(plan&&typeof plan==='object'&&!Array.isArray(plan)&&
    kinds.has(plan.kind)&&abilities.has(plan.ability)&&resources.has(plan.resource)&&advantages.has(plan.advantage)&&
    Number.isInteger(plan.dc)&&typeof plan.proficient==='boolean'&&typeof plan.stakes==='string'&&typeof plan.intent==='string');
}

function isOrdinaryInformationRequest(action){
  if(typeof action!=='string')return false;
  const text=action.trim();
  return !!text&&!influenceAttempt.test(text)&&(informationRequest.test(text)||directQuestion.test(text));
}

function applyAdjudicationPolicy(plan,action){
  if(plan.kind!=='check'||plan.resource!=='none'||!isOrdinaryInformationRequest(action))return plan;
  // Asking for available information is not itself persuasion. If an NPC refuses,
  // narration can say so and leave the player a lead; a roll belongs to a later
  // attempt to change that NPC's mind, deceive them or apply pressure.
  return {...plan,kind:'none',dc:0,advantage:'normal',proficient:false,stakes:'What the conversation freely reveals without changing anyone’s mind.'};
}

function invalidPlanError(groq){
  return new groq.ProviderError('The dungeon master returned an incomplete adjudication. Nothing has been changed.',502,0,{
    providerStatus:200,
    providerCode:'invalid_model_output',
    stage:'plan'
  });
}

async function generateValidatedPlan({groq,world,state,action,env=process.env}){
  const messages=world.planMessages(state,action);
  let plan=await groq.generate(messages,world.planSchema,{env,stage:'plan'});
  if(validPlan(plan))return applyAdjudicationPolicy(plan,action);

  // A provider can occasionally return parseable JSON that still violates the
  // local contract despite response_format=json_schema. Do not let that object
  // reach the deterministic rules engine. Retry once using the configured
  // fallback model with a clean instruction; no save or player text is logged.
  const fallbackModel=env.GROQ_FALLBACK_MODEL||'openai/gpt-oss-20b';
  const retryEnv={...env,GROQ_MODEL:fallbackModel,GROQ_FALLBACK_MODEL:fallbackModel};
  const retryMessages=[...messages,{role:'user',content:'Your previous adjudication failed local validation. Return a fresh adjudication matching the required JSON schema exactly. Use only the allowed enum values, an integer DC, and a boolean proficient field. Do not include commentary.'}];
  plan=await groq.generate(retryMessages,world.planSchema,{env:retryEnv,stage:'plan'});
  if(validPlan(plan))return applyAdjudicationPolicy(plan,action);
  throw invalidPlanError(groq);
}

module.exports={validPlan,isOrdinaryInformationRequest,applyAdjudicationPolicy,generateValidatedPlan};
