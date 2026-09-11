'use strict';
function campaignSigningSecret(env){
  const secret=env.DND_SESSION_SECRET;
  return typeof secret==='string'&&secret.length>=32?secret:null;
}
module.exports={campaignSigningSecret};
