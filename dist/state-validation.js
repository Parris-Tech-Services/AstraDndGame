(function(root){
'use strict';
const classes=new Set(['fighter','rogue','wizard']);
const origins=new Set(['human','elf','dwarf','halfling','tiefling','dragonborn']);
const backgrounds=new Set(['outlander','soldier','sage','acolyte','criminal','artisan','noble','urchin']);
const tones=new Set(['balanced','heroic','mystery','whimsical']);
const dangers=new Set(['safe','tense','dangerous']);
const conditions=new Set(['blinded','charmed','deafened','frightened','grappled','incapacitated','invisible','paralysed','poisoned','prone','restrained','stunned','unconscious','exhausted']);
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=value=>Number.isFinite(value);
const integer=value=>Number.isInteger(value);
const text=(value,max,allowEmpty=true)=>typeof value==='string'&&value.length<=max&&(allowEmpty||value.trim().length>0);
const strings=(value,maxItems,maxLength)=>Array.isArray(value)&&value.length<=maxItems&&value.every(item=>text(item,maxLength));
function validHistory(value){return Array.isArray(value)&&value.length<=6&&value.every(entry=>isObject(entry)&&text(entry.action,1000)&&text(entry.narrative,2500))}
function validDeathSaves(value){return value===undefined||(isObject(value)&&integer(value.successes)&&value.successes>=0&&value.successes<=3&&integer(value.failures)&&value.failures>=0&&value.failures<=3&&typeof value.stable==='boolean'&&typeof value.defeated==='boolean')}
function validActor(actor){return isObject(actor)&&text(actor.id,80,false)&&text(actor.name,100,false)&&text(actor.faction,30,false)&&integer(actor.x)&&integer(actor.y)&&finite(actor.hp)&&finite(actor.maxHp)&&actor.maxHp>0&&finite(actor.ac)}
function validGrid(grid){return isObject(grid)&&integer(grid.width)&&grid.width>0&&grid.width<=50&&integer(grid.height)&&grid.height>0&&grid.height<=50&&finite(grid.cellSizeFt)&&grid.cellSizeFt>0&&isObject(grid.cells)}
function validCombat(value){
  if(value===undefined)return true;
  if(!isObject(value)||typeof value.active!=='boolean'||!integer(value.round)||!text(value.turn,30)||!isObject(value.actors)||!Array.isArray(value.log)||value.log.length>30||!value.log.every(line=>text(line,400)))return false;
  if(!Object.values(value.actors).every(validActor))return false;
  if(value.grid!==null&&!validGrid(value.grid))return false;
  if(value.reachable!==undefined&&(!Array.isArray(value.reachable)||value.reachable.length>2500||!value.reachable.every(cell=>isObject(cell)&&integer(cell.x)&&integer(cell.y))))return false;
  return true;
}
function validExploration(value){
  if(value===undefined)return true;
  if(!isObject(value)||!text(value.currentId,100,false)||!Array.isArray(value.nodes)||value.nodes.length>40||!Array.isArray(value.edges)||value.edges.length>80)return false;
  const nodes=value.nodes.every(node=>isObject(node)&&text(node.id,100,false)&&text(node.name,100,false)&&finite(node.x)&&finite(node.y));
  const edges=value.edges.every(edge=>isObject(edge)&&text(edge.from,100,false)&&text(edge.to,100,false)&&text(edge.label,120)&&finite(edge.distanceFt)&&typeof edge.locked==='boolean');
  return nodes&&edges;
}
function validSpatial(value){return value===undefined||(isObject(value)&&validExploration(value.exploration))}
function optionalEnum(value,set){return value===undefined||(typeof value==='string'&&set.has(value))}
function optionalStrings(value,maxItems,maxLength){return value===undefined||strings(value,maxItems,maxLength)}
function validState(state){
  if(!isObject(state)||state.version!==3||!classes.has(state.cls)||!text(state.id,100,false)||!text(state.name,30,false))return false;
  if(!integer(state.turn)||state.turn<0||!integer(state.level)||state.level<1||!finite(state.xp)||state.xp<0)return false;
  if(!finite(state.hp)||!finite(state.maxHp)||state.maxHp<=0||state.hp<0||state.hp>state.maxHp||!finite(state.ac)||!finite(state.slots)||!finite(state.potions)||!finite(state.gold))return false;
  if(!text(state.location,100,false)||!text(state.time,100,false)||!text(state.narrative,5000,false))return false;
  if(!strings(state.inventory,30,160)||!strings(state.npcs,15,260)||!strings(state.quests,12,200)||!strings(state.places,20,180)||!strings(state.suggestions,4,140)||!validHistory(state.history))return false;
  if(!optionalEnum(state.origin,origins)||!optionalEnum(state.background,backgrounds)||!optionalEnum(state.tone,tones)||!optionalEnum(state.danger,dangers))return false;
  if(state.backstory!==undefined&&!text(state.backstory,700)||state.goal!==undefined&&!text(state.goal,350)||state.memory!==undefined&&!text(state.memory,3500)||state.prologue!==undefined&&!text(state.prologue,5000))return false;
  if(!optionalStrings(state.exits,8,120)||!optionalStrings(state.factions,12,220)||!optionalStrings(state.facts,16,260)||!optionalStrings(state.journalEvents,18,240))return false;
  if(state.conditions!==undefined&&(!Array.isArray(state.conditions)||state.conditions.length>6||!state.conditions.every(condition=>typeof condition==='string'&&conditions.has(condition.toLowerCase()))))return false;
  if(!validDeathSaves(state.deathSaves)||!validCombat(state.combat)||!validSpatial(state.spatial))return false;
  return true;
}
function validCampaign(value){return !!(isObject(value)&&text(value.save,80000,false)&&value.save.length>10&&validState(value.state))}
function parseCampaign(raw){
  if(typeof raw!=='string'||!raw)return null;
  try{const value=JSON.parse(raw);return validCampaign(value)?value:null}catch{return null}
}
const api={validState,validCampaign,parseCampaign};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.AstraValidation=api;
})(typeof window!=='undefined'?window:globalThis);
