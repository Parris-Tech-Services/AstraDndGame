'use strict';
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function reply(res,status,body){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  return res.status(status).json(body);
}
function sameOrigin(req){
  const origin=req.headers.origin;if(!origin)return true;
  try{return new URL(origin).host===req.headers.host}catch{return false}
}
function parseBody(req,maxBytes=100000){
  const raw=req.body;
  let value;
  if(typeof raw==='string'){
    if(Buffer.byteLength(raw,'utf8')>maxBytes)throw new Error('request_too_large');
    value=JSON.parse(raw);
  }else value=raw;
  if(!isObject(value))throw new Error('invalid_request');
  if(Buffer.byteLength(JSON.stringify(value),'utf8')>maxBytes)throw new Error('request_too_large');
  return value;
}
function clientIp(req){return String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim()}
function consumeRateLimit(store,key,{limit,windowMs=60000,maxEntries=5000,now=Date.now()}={}){
  for(const [entryKey,value] of store)if(value.reset<=now)store.delete(entryKey);
  if(store.size>maxEntries)store.delete(store.keys().next().value);
  const entry=store.get(key)||{count:0,reset:now+windowMs};
  if(entry.count>=limit)return Math.max(1,Math.ceil((entry.reset-now)/1000));
  entry.count++;store.set(key,entry);return 0;
}
function pruneCache(store,{maxEntries=300,now=Date.now()}={}){
  for(const [key,value] of store)if(value.expires<=now)store.delete(key);
  while(store.size>maxEntries)store.delete(store.keys().next().value);
}
function validRequestId(value){return typeof value==='string'&&/^[a-zA-Z0-9-]{16,60}$/.test(value)}
function onlyKeys(value,allowed){return isObject(value)&&Object.keys(value).every(key=>allowed.has(key))}
module.exports={isObject,reply,sameOrigin,parseBody,clientIp,consumeRateLimit,pruneCache,validRequestId,onlyKeys};
