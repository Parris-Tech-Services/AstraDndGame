'use strict';
const modelOutput=require('./model-output.cjs');
const kinds=new Set(['none','check','attack','save']);
const abilities=new Set(['STR','DEX','CON','INT','WIS','CHA']);
const resources=new Set(['none','spell','potion','secondWind']);
const advantages=new Set(['normal','advantage','disadvantage']);
const informationRequest=/^(?:i\s+)?(?:(?:ask|question|speak\s+to|talk\s+to)\b[\s\S]{0,180}\b(?:about|what|where|when|who|why|how|whether)\b|(?:tell|explain|describe)\b)/i;
const directQuestion=/^(?:what|where|when|who|why|how|is|are|did|does|do|can|could|would)\b/i;
const influenceAttempt=/\b(?:persuad\w*|convinc\w*|deceiv\w*|lie\b|bluff\w*|intimidat\w*|threaten\w*|coerc\w*|brib\w*|charm\w*|pressure\w*|demand\w*|force\w*|trick\w*)\b/i;
function validPlan(plan){
  return !!(plan&&typeof plan==='object'&&!Array.isArray(plan)&&kinds.has(plan.kind)&&abilities.has(plan.ability)&&resources.has(plan.resource)&&advantages.has(plan.advantage)&&Number.isInteger(plan.dc)&&plan.dc>=0&&plan.dc<=25&&typeof plan.proficient==='boolean'&&typeof plan.stakes==='string'&&plan.stakes.length<=350&&typeof plan.intent==='string'&&plan.intent.length<=350);
}
function isOrdinaryInformationRequest(action){
  if(typeof action!=='string')return false;
  const text=action.trim();
  return !!text&&!influenceAttempt.test(text)&&(informationRequest.test(text)||directQuestion.test(text));
}
function applyAdjudicationPolicy(plan,action){
  if(plan.kind!=='check'||plan.resource!=='none'||!isOrdinaryInformationRequest(action))return plan;
  // Asking for available information is not itself persuasion. A later attempt to
  // change an NPC's mind can legitimately create a check.
  return {...plan,kind:'none',dc:0,advantage:'normal',proficient:false,stakes:'What the conversation freely reveals without changing anyone’s mind.'};
}
async function generateValidatedPlan({groq,world,state,action,env=process.env}){
  const plan=await modelOutput.generateValidated({
    groq,
    messages:world.planMessages(state,action),
    schema:world.planSchema,
    validate:validPlan,
    env,
    stage:'plan',
    repairInstruction:'Your previous adjudication failed local validation. Return a fresh adjudication matching the required JSON schema exactly. Use only allowed enum values, an integer DC from 0 to 25, and a boolean proficient field. Do not include commentary.'
  });
  return applyAdjudicationPolicy(plan,action);
}
module.exports={validPlan,isOrdinaryInformationRequest,applyAdjudicationPolicy,generateValidatedPlan};
