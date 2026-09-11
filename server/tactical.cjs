'use strict';
const {randomInt}=require('node:crypto');
const spatial=require('./spatial.cjs');
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const text=(value,max=80)=>typeof value==='string'?value.trim().slice(0,max):'';
const cellKey=(x,y)=>`${x},${y}`;
const die=(sides,roll=randomInt)=>roll(1,sides+1);
const distanceFt=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*5;
const occupied=(combat,x,y,except)=>Object.values(combat.actors||{}).some(actor=>actor.id!==except&&actor.hp>0&&actor.x===x&&actor.y===y);
function deriveExploration(state){return spatial.deriveExploration(state)}
function blankCombat(){return {active:false,round:0,turn:'hero',actors:{},grid:null,log:[],reachable:[]}}
function enrichSpatial(state){
  const next=spatial.enrichExploration(state);
  if(!next.combat||typeof next.combat!=='object'||Array.isArray(next.combat))next.combat=blankCombat();
  next.combat.reachable=next.combat.active?reachableFromState(next):[];
  return next;
}
function makeGrid(state){
  const width=12,height=8,cells={};
  const seed=[...String(state.location||'')].reduce((value,char)=>((value*33)^char.charCodeAt(0))>>>0,5381);
  const obstacles=[{x:5,y:2+(seed%3),terrain:'difficult',cover:'half'},{x:5,y:3+(seed%3),terrain:'blocked',cover:'total'},{x:6,y:2+((seed>>>3)%3),terrain:'difficult',cover:'half'}];
  for(const obstacle of obstacles)if(obstacle.y<height)cells[cellKey(obstacle.x,obstacle.y)]=obstacle;
  return {width,height,cellSizeFt:5,cells};
}
function startEncounter(state,enemyName='Hostile creature'){
  let next=enrichSpatial(state);if(next.combat.active)return next;
  const enemy=text(enemyName,60)||'Hostile creature',grid=makeGrid(next);
  const hero={id:'hero',name:text(next.name,40)||'Hero',faction:'party',x:2,y:4,hp:clamp(Number(next.hp)||1,0,999),maxHp:clamp(Number(next.maxHp)||1,1,999),ac:clamp(Number(next.ac)||10,1,30),speed:30,movementSpentFt:0,actionUsed:false,bonusActionUsed:false,reactionAvailable:true,disengaged:false,dashed:false};
  const foe={id:'enemy-1',name:enemy,faction:'enemy',x:9,y:4,hp:12,maxHp:12,ac:12,speed:30,movementSpentFt:0,actionUsed:false,bonusActionUsed:false,reactionAvailable:true,disengaged:false,dashed:false};
  next.combat={active:true,round:1,turn:'hero',actors:{hero,[foe.id]:foe},grid,log:[`Tactical encounter began: ${enemy}.`],reachable:[]};
  return enrichSpatial(next);
}
function cellAt(combat,x,y){return combat.grid?.cells?.[cellKey(x,y)]||null}
function inBounds(combat,x,y){return !!combat.grid&&Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<combat.grid.width&&y<combat.grid.height}
function movementAllowance(actor){return actor.speed*(actor.dashed?2:1)}
function withReachable(state,result={}){state.combat.reachable=state.combat.active?reachableFromState(state):[];return {state,...result}}
function move(state,x,y,roll=randomInt){
  const next=enrichSpatial(state),combat=next.combat;if(!combat.active||combat.turn!=='hero')return withReachable(next,{ok:false,summary:'It is not your movement turn.'});
  const hero=combat.actors.hero,enemy=combat.actors['enemy-1'];if(!hero)return withReachable(next,{ok:false,summary:'No active hero.'});
  if(!inBounds(combat,x,y)||cellAt(combat,x,y)?.terrain==='blocked'||occupied(combat,x,y,'hero'))return withReachable(next,{ok:false,summary:'That space is blocked.'});
  const steps=Math.max(Math.abs(hero.x-x),Math.abs(hero.y-y)),cost=steps*5*(cellAt(combat,x,y)?.terrain==='difficult'?2:1);
  if(hero.movementSpentFt+cost>movementAllowance(hero))return withReachable(next,{ok:false,summary:`That move exceeds ${movementAllowance(hero)-hero.movementSpentFt} ft remaining.`});
  const oldPosition={x:hero.x,y:hero.y},wasInReach=enemy&&enemy.hp>0&&distanceFt(oldPosition,enemy)<=5;
  hero.x=x;hero.y=y;hero.movementSpentFt+=cost;
  let summary=`${hero.name} moved ${cost} ft to (${x}, ${y}).`;
  if(wasInReach&&enemy&&distanceFt(hero,enemy)>5&&enemy.reactionAvailable&&!hero.disengaged){
    enemy.reactionAvailable=false;const attackDie=die(20,roll),total=attackDie+3,hit=attackDie===20||(attackDie!==1&&total>=hero.ac);
    if(hit){const damage=die(6,roll)+1;hero.hp=Math.max(0,hero.hp-damage);next.hp=hero.hp;summary+=` ${enemy.name} used an opportunity attack and dealt ${damage} damage.`}
    else summary+=` ${enemy.name} used an opportunity attack and missed.`;
  }
  combat.log=[...(combat.log||[]),summary].slice(-30);if(hero.hp<=0)downHero(next);return withReachable(next,{ok:true,summary});
}
function dash(state){
  const next=enrichSpatial(state),combat=next.combat;if(!combat.active||combat.turn!=='hero')return withReachable(next,{ok:false,summary:'You cannot Dash right now.'});
  const hero=combat.actors.hero;if(hero.actionUsed)return withReachable(next,{ok:false,summary:'Your action is already used.'});
  hero.actionUsed=true;hero.dashed=true;const summary='You Dash, doubling your movement allowance this turn.';combat.log=[...(combat.log||[]),summary].slice(-30);return withReachable(next,{ok:true,summary});
}
function disengage(state){
  const next=enrichSpatial(state),combat=next.combat;if(!combat.active||combat.turn!=='hero')return withReachable(next,{ok:false,summary:'You cannot Disengage right now.'});
  const hero=combat.actors.hero;if(hero.actionUsed)return withReachable(next,{ok:false,summary:'Your action is already used.'});
  hero.actionUsed=true;hero.disengaged=true;const summary='You Disengage; movement this turn will not trigger opportunity attacks.';combat.log=[...(combat.log||[]),summary].slice(-30);return withReachable(next,{ok:true,summary});
}
function trace(combat,start,end){
  const cells=[];let x0=start.x,y0=start.y,x1=end.x,y1=end.y,dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,error=dx-dy;
  while(!(x0===x1&&y0===y1)){const doubled=2*error;if(doubled>-dy){error-=dy;x0+=sx}if(doubled<dx){error+=dx;y0+=sy}if(!(x0===x1&&y0===y1))cells.push({x:x0,y:y0})}
  return cells;
}
function coverBetween(combat,start,end){
  let cover='none';for(const point of trace(combat,start,end)){const cell=cellAt(combat,point.x,point.y);if(cell?.terrain==='blocked'||cell?.cover==='total')return 'total';if(cell?.cover==='threequarters')cover='threequarters';else if(cell?.cover==='half'&&cover==='none')cover='half'}return cover;
}
function playerAttackProfile(state){
  if(state.cls==='fighter')return {ranged:false,range:5,die:8,bonus:3,label:'Longsword'};
  if(state.cls==='rogue')return {ranged:true,range:80,die:6,bonus:3,label:'Shortbow'};
  return {ranged:true,range:60,die:10,bonus:0,label:'Fire Bolt'};
}
function attack(state,targetId='enemy-1',roll=randomInt){
  const next=enrichSpatial(state),combat=next.combat;if(!combat.active||combat.turn!=='hero')return withReachable(next,{ok:false,summary:'It is not your attack turn.'});
  const hero=combat.actors.hero,target=combat.actors[targetId];if(!hero||!target||target.hp<=0)return withReachable(next,{ok:false,summary:'There is no valid target.'});
  if(hero.actionUsed)return withReachable(next,{ok:false,summary:'Your action is already used.'});
  const profile=playerAttackProfile(next),distance=distanceFt(hero,target);if(distance>profile.range)return withReachable(next,{ok:false,summary:`Target is ${distance} ft away; your ${profile.label} reaches ${profile.range} ft.`});
  const cover=profile.ranged?coverBetween(combat,hero,target):'none';if(cover==='total')return withReachable(next,{ok:false,summary:'Total cover blocks the attack.'});
  hero.actionUsed=true;const attackBonus=5,coverAc=cover==='half'?2:cover==='threequarters'?5:0,attackDie=die(20,roll),total=attackDie+attackBonus,hit=attackDie===20||(attackDie!==1&&total>=target.ac+coverAc);
  let summary=`Attack roll ${attackDie} + ${attackBonus} = ${total}${coverAc?` against AC ${target.ac+coverAc} (${cover} cover)`:''}.`;
  if(hit){
    let damage=die(profile.die,roll)+profile.bonus;if(attackDie===20)damage+=die(profile.die,roll);target.hp=Math.max(0,target.hp-damage);summary+=` Hit for ${damage} damage.`;
    if(target.hp<=0){summary+=` ${target.name} is defeated.`;combat.active=false;combat.turn='complete';next.facts=[...(Array.isArray(next.facts)?next.facts:[]),`Defeated ${target.name} in a tactical encounter at ${next.location}.`].slice(-16);next.journalEvents=[...(Array.isArray(next.journalEvents)?next.journalEvents:[]),`Won a tactical encounter against ${target.name}.`].slice(-18)}
  }else summary+=' Miss.';
  combat.log=[...(combat.log||[]),summary].slice(-30);return withReachable(next,{ok:true,summary,roll:{die:attackDie,total,cover},targetHp:target.hp});
}
function enemyAttack(state,roll=randomInt){
  const combat=state.combat,hero=combat.actors.hero,enemy=combat.actors['enemy-1'];if(!hero||!enemy||enemy.hp<=0)return 'No enemy can act.';
  const attackDie=die(20,roll),total=attackDie+3,hit=attackDie===20||(attackDie!==1&&total>=hero.ac);if(!hit)return `${enemy.name} attacks and misses (${attackDie} + 3).`;
  const damage=die(6,roll)+1;hero.hp=Math.max(0,hero.hp-damage);state.hp=hero.hp;return `${enemy.name} hits for ${damage} damage.`;
}
function stepToward(combat,actor,target){
  for(let step=0;step<6&&distanceFt(actor,target)>5;step++){
    const dx=Math.sign(target.x-actor.x),dy=Math.sign(target.y-actor.y),nextX=actor.x+(Math.abs(target.x-actor.x)>=Math.abs(target.y-actor.y)?dx:0),nextY=actor.y+(Math.abs(target.y-actor.y)>Math.abs(target.x-actor.x)?dy:0);
    if(!inBounds(combat,nextX,nextY)||cellAt(combat,nextX,nextY)?.terrain==='blocked'||occupied(combat,nextX,nextY,actor.id))break;actor.x=nextX;actor.y=nextY;
  }
}
function endTurn(state,roll=randomInt){
  const next=enrichSpatial(state),combat=next.combat;if(!combat.active||combat.turn!=='hero')return withReachable(next,{ok:false,summary:'The tactical turn cannot end right now.'});
  const hero=combat.actors.hero,enemy=combat.actors['enemy-1'];combat.turn='enemy';let summary='';
  if(enemy&&enemy.hp>0){if(distanceFt(enemy,hero)>5){stepToward(combat,enemy,hero);summary=`${enemy.name} closes the distance. `}if(distanceFt(enemy,hero)<=5)summary+=enemyAttack(next,roll)}
  if(next.hp<=0){downHero(next);summary+=' You fall unconscious.';return withReachable(next,{ok:true,summary})}
  combat.round=(combat.round||1)+1;combat.turn='hero';hero.actionUsed=false;hero.bonusActionUsed=false;hero.movementSpentFt=0;hero.reactionAvailable=true;hero.disengaged=false;hero.dashed=false;if(enemy){enemy.actionUsed=false;enemy.movementSpentFt=0;enemy.reactionAvailable=true}
  combat.log=[...(combat.log||[]),summary||'The enemy hesitates.'].slice(-30);return withReachable(next,{ok:true,summary:summary||'The enemy hesitates.'});
}
function downHero(state){
  const combat=state.combat;combat.active=false;combat.turn='complete';if(!Array.isArray(state.conditions))state.conditions=[];if(!state.conditions.includes('unconscious'))state.conditions.push('unconscious');state.journalEvents=[...(Array.isArray(state.journalEvents)?state.journalEvents:[]),'Fell unconscious during a tactical encounter.'].slice(-18);
}
function reachableFromState(state){
  const combat=state.combat;if(!combat?.active||!combat.grid)return [];const hero=combat.actors.hero;if(!hero)return [];
  const remaining=movementAllowance(hero)-hero.movementSpentFt,reachable=[];
  for(let y=0;y<combat.grid.height;y++)for(let x=0;x<combat.grid.width;x++){
    if(cellAt(combat,x,y)?.terrain==='blocked'||occupied(combat,x,y,'hero'))continue;
    const cost=Math.max(Math.abs(hero.x-x),Math.abs(hero.y-y))*5*(cellAt(combat,x,y)?.terrain==='difficult'?2:1);if(cost<=remaining)reachable.push({x,y});
  }
  return reachable;
}
function reachable(state){return enrichSpatial(state).combat.reachable}
module.exports={deriveExploration,enrichSpatial,startEncounter,move,dash,disengage,attack,endTurn,reachable,coverBetween,distanceFt};
