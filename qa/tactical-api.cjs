'use strict';
const assert=require('node:assert/strict');
process.env.DND_SESSION_SECRET='tactical-api-test-secret-1234567890';
process.env.VERCEL_GIT_COMMIT_SHA='abcdef1234567890';
process.env.VERCEL='1';
const world=require('../server/world.cjs');
const handler=require('../api/tactical.js');
let ipCounter=0;
async function call(method,body,headers={}){
  const response={statusCode:200,headers:{},body:null,setHeader(key,value){this.headers[key.toLowerCase()]=String(value)},status(code){this.statusCode=code;return this},json(value){this.body=value;return value}};
  const req={method,body,headers:{host:'game.test','x-forwarded-for':`203.0.113.${++ipCounter}`,...headers},socket:{remoteAddress:'127.0.0.1'}};
  await handler(req,response);return response;
}
(async()=>{
  let response=await call('GET');assert.equal(response.statusCode,200);assert.equal(response.body.configured,true);assert.equal(response.body.build,'abcdef123456');
  const initial=world.initial('Tactical QA','fighter'),save=world.sign(initial,process.env.DND_SESSION_SECRET);
  response=await call('POST',{save,op:'start',requestId:'req-tactical-00001'},{origin:'https://evil.test'});assert.equal(response.statusCode,403);
  response=await call('POST',{save,op:'start'});assert.equal(response.statusCode,400,'state-changing tactical calls require an idempotency key');
  const startRequest={save,op:'start',enemyName:'QA Hound',requestId:'req-tactical-00002'};
  const first=await call('POST',startRequest);assert.equal(first.statusCode,200);assert.equal(first.body.state.combat.active,true);assert.equal(first.body.state.combat.actors['enemy-1'].name,'QA Hound');assert(Array.isArray(first.body.state.combat.reachable));
  const duplicate=await call('POST',startRequest);assert.equal(duplicate.statusCode,200);assert.equal(duplicate.body.save,first.body.save,'duplicate start must return the cached result');assert.deepEqual(duplicate.body.state,first.body.state);
  const moveRequest={save:first.body.save,op:'move',x:3,y:4,requestId:'req-tactical-00003'};
  const moved=await call('POST',moveRequest);assert.equal(moved.statusCode,200);assert.equal(moved.body.state.combat.actors.hero.x,3);assert.equal(moved.body.state.combat.actors.hero.movementSpentFt,5);
  const movedDuplicate=await call('POST',moveRequest);assert.equal(movedDuplicate.statusCode,200);assert.equal(movedDuplicate.body.save,moved.body.save,'duplicate move must not spend movement twice');assert.equal(movedDuplicate.body.state.combat.actors.hero.movementSpentFt,5);
  response=await call('POST',{save:first.body.save,op:'move',x:999,y:999,requestId:'req-tactical-00004'});assert.equal(response.statusCode,409);assert.equal(response.body.ok,false);assert.equal(response.body.state.combat.actors.hero.x,2,'rejected move must preserve authoritative position');
  response=await call('POST',{save:first.body.save,op:'unknown',requestId:'req-tactical-00005'});assert.equal(response.statusCode,400);
  console.log('Tactical API QA passed: boundary validation, signed state, idempotent retries and rejected-action invariants.');
})().catch(error=>{console.error(error);process.exit(1)});
