'use strict';
const text=(value,max=100)=>typeof value==='string'?value.trim().slice(0,max):'';
function locationId(name){
  const safe=text(name,90);
  const base=safe.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'place';
  let hash=2166136261;
  for(const char of safe){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}
  return `${base.slice(0,36)}-${(hash>>>0).toString(36).slice(0,5)}`;
}
function deriveExploration(state){
  const prior=state?.spatial?.exploration;
  const nodes=new Map(Array.isArray(prior?.nodes)?prior.nodes.filter(node=>node&&typeof node.id==='string').map(node=>[node.id,{...node}]):[]);
  const currentName=text(state?.location)||'Unknown location';
  const currentId=locationId(currentName);
  if(!nodes.has(currentId))nodes.set(currentId,{id:currentId,name:currentName,x:0,y:0,discovered:true});
  const exits=Array.isArray(state?.exits)?state.exits.slice(0,8):[];
  const edges=[];
  exits.forEach((name,index)=>{
    const label=text(name);if(!label)return;
    const id=locationId(label);
    if(!nodes.has(id)){
      const angle=(Math.PI*2*index/Math.max(1,exits.length))-(Math.PI/2),radius=3+(index%2);
      nodes.set(id,{id,name:label,x:Math.round(Math.cos(angle)*radius*10)/10,y:Math.round(Math.sin(angle)*radius*10)/10,discovered:true});
    }
    edges.push({from:currentId,to:id,label,distanceFt:Math.max(250,500+(index*250)),locked:false});
  });
  return {currentId,nodes:[...nodes.values()].slice(-40),edges};
}
function enrichExploration(state){
  const next=structuredClone(state||{});
  next.spatial={...(next.spatial&&typeof next.spatial==='object'&&!Array.isArray(next.spatial)?next.spatial:{}),exploration:deriveExploration(next)};
  return next;
}
module.exports={locationId,deriveExploration,enrichExploration};
