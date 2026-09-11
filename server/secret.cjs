'use strict';
const crypto=require('node:crypto');
const LEGACY_CONTEXT='astra-dnd-save-signing-v3';
function parsePreviousSecrets(env){
  let values=[];
  try{values=JSON.parse(env.DND_SESSION_SECRET_PREVIOUS||'[]')}catch{values=(env.DND_SESSION_SECRET_PREVIOUS||'').split(/[\s,]+/)}
  if(!Array.isArray(values))values=[];
  return values.filter(value=>typeof value==='string'&&value.length>=32);
}
function explicitSigningSecrets(env){
  const current=typeof env.DND_SESSION_SECRET==='string'&&env.DND_SESSION_SECRET.length>=32?env.DND_SESSION_SECRET:null;
  return [...new Set([current,...parsePreviousSecrets(env)].filter(Boolean))];
}
function legacyProviderSecrets(env,groq){
  if(!groq||typeof groq.keys!=='function')return [];
  return groq.keys(env).map(key=>crypto.createHmac('sha256',key).update(LEGACY_CONTEXT).digest('hex'));
}
function campaignSigningSecrets(env,groq){
  // Explicit secrets are always preferred for new signatures. Legacy provider-derived secrets
  // remain verification fallbacks so a migration does not invalidate existing 30-day saves.
  return [...new Set([...explicitSigningSecrets(env),...legacyProviderSecrets(env,groq)])];
}
function campaignSigningSecret(env,groq){return campaignSigningSecrets(env,groq)[0]||null}
function signingMode(env){return explicitSigningSecrets(env).length?'explicit':'legacy-provider-derived'}
module.exports={campaignSigningSecret,campaignSigningSecrets,signingMode};
