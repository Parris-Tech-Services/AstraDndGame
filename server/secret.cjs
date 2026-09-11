'use strict';
const crypto=require('node:crypto');
function campaignSigningSecret(env,groq){
  if(typeof env.DND_SESSION_SECRET==='string'&&env.DND_SESSION_SECRET.length>0)return env.DND_SESSION_SECRET.length>=32?env.DND_SESSION_SECRET:null;
  const first=groq.keys(env)[0];return first?crypto.createHmac('sha256',first).update('astra-dnd-save-signing-v3').digest('hex'):null;
}
module.exports={campaignSigningSecret};
