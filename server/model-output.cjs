'use strict';
function invalidOutputError(groq,stage){
  return new groq.ProviderError('The dungeon master returned an incomplete response. Nothing has been changed.',502,0,{
    providerStatus:200,
    providerCode:'invalid_model_output',
    stage
  });
}
async function generateValidated({groq,messages,schema,validate,env=process.env,stage,repairInstruction}){
  let value=await groq.generate(messages,schema,{env,stage});
  if(validate(value))return value;
  const fallbackModel=env.GROQ_FALLBACK_MODEL||'openai/gpt-oss-20b';
  const retryEnv={...env,GROQ_MODEL:fallbackModel,GROQ_FALLBACK_MODEL:fallbackModel};
  const retryMessages=[...messages,{role:'user',content:repairInstruction||'Your previous response failed local validation. Return fresh JSON matching the required schema exactly. Do not include commentary.'}];
  value=await groq.generate(retryMessages,schema,{env:retryEnv,stage});
  if(validate(value))return value;
  throw invalidOutputError(groq,stage);
}
module.exports={generateValidated,invalidOutputError};
