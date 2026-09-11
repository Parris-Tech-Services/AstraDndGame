'use strict';
const env=process.env;
const world=require('../server/world.cjs');const groq=require('../server/groq.cjs');const adjudication=require('../server/adjudication.cjs');
const responses=new Map(),inflight=new Set();
function reply(res,status,body){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(status).json(body)}
function logProviderError(error){
  console.error('[astra-dnd groq]',JSON.stringify({
    status:error.status,
    providerStatus:error.providerStatus||0,
    providerCode:error.providerCode||'',
    providerType:error.providerType||'',
    // Do not log providerMessage as it might reflect user-provided action text
    model:error.model||'',
    stage:error.stage||'',
    retryAfter:error.retryAfter||0
  }));
}
module.exports=async function handler(req,res){
const keyPool=groq.keys(env);const secret=env.DND_SESSION_SECRET||(keyPool[0]?require('node:crypto').createHmac('sha256',keyPool[0]).update('astra-dnd-save-signing-v3').digest('hex'):null);const configured=keyPool.length>0&&!!secret;
if(req.method==='GET')return reply(res,200,{configured,mode:'open-world',version:3,features:['identity','backgrounds','conditions','death-saves','attack-damage','map-exits','factions','journal','local-commands'],build:(env.VERCEL_GIT_COMMIT_SHA||'local').slice(0,12)});
if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return reply(res,405,{error:'Method not allowed.'})}
if(!require('../server/security.cjs').checkOrigin(req))return reply(res,403,{error:'Please play from the game website.'});
if(!configured)return reply(res,503,{error:'The open-world dungeon master is waiting for its server credentials. The original adventure is still available.'});
let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!body||JSON.stringify(body).length>100000)throw new Error()}catch{return reply(res,400,{error:'Invalid request.'})}
const now=Date.now();for(const[k,v]of responses)if(v.expires<=now)responses.delete(k);if(responses.size>300)responses.delete(responses.keys().next().value);
if(require('../server/ratelimit.cjs').isRateLimited(req, { bucket: 'turn', maxRequests: 12, windowMs: 60000 })){console.warn('[astra-dnd telemetry]',JSON.stringify({route:'/api/turn',status:429,error:'rate_limit_local'}));res.setHeader('Retry-After','60');return reply(res,429,{error:'Too many turns at once. Please wait a minute.',retryAfter:60})}
if(body.start===true){try{const state=world.initial(typeof body.name==='string'?body.name:'Rowan',body.cls,{origin:body.origin,background:body.background,tone:body.tone,backstory:body.backstory,goal:body.goal});return reply(res,200,{state,save:world.sign(state,secret)})}catch{return reply(res,400,{error:'Choose a character class.'})}}
const action=typeof body.action==='string'?body.action.trim():'';if(!action||action.length>1000)return reply(res,400,{error:'Write an action of 1–1,000 characters.'});let old;try{old=world.verify(body.save,secret)}catch{return reply(res,400,{error:'This save cannot be verified or has expired. Start a new open-world adventure.'})}
const requestId=typeof body.requestId==='string'?body.requestId:'';if(!/^[a-zA-Z0-9-]{16,60}$/.test(requestId))return reply(res,400,{error:'Invalid turn identifier.'});const cacheKey=old.id+':'+old.turn+':'+requestId;if(responses.has(cacheKey))return reply(res,200,responses.get(cacheKey).data);if(inflight.has(old.id))return reply(res,409,{error:'Your previous turn is still being resolved.'});inflight.add(old.id);
const startTime = Date.now();
try{const plan=await adjudication.generateValidatedPlan({groq,world,state:old,action,env});const {state,resolution}=world.resolve(old,plan,undefined,action);const result=await groq.generate(world.narrateMessages(state,action,resolution),world.turnSchema,{env,stage:'narrate'});const updated=world.apply(state,result,action,resolution);const data={state:updated,save:world.sign(updated,secret),resolution};responses.set(cacheKey,{data,expires:Date.now()+120000});console.log('[astra-dnd telemetry]',JSON.stringify({route:'/api/turn',status:200,latency:Date.now()-startTime}));return reply(res,200,data)}catch(e){const provider=e instanceof groq.ProviderError;if(provider)logProviderError(e);else console.error('[astra-dnd turn]',e instanceof Error?e.message:String(e));const status=provider?e.status:503;const retryAfter=provider?e.retryAfter||0:0;if(retryAfter)res.setHeader('Retry-After',String(retryAfter));console.error('[astra-dnd telemetry]',JSON.stringify({route:'/api/turn',status,latency:Date.now()-startTime,error:provider?e.providerCode:'internal'}));return reply(res,status,{error:provider?e.message:'The turn could not be safely resolved. Your save is unchanged; please try again.',retryAfter})}finally{inflight.delete(old.id)}
};
