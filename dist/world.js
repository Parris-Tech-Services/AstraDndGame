'use strict';
const G=window.Blackthorn,V=window.AstraValidation,$=id=>document.getElementById(id),storageKey='astra-open-world-v3';
if(!G||!V)throw new Error('Astra core modules did not load.');
let campaign=null,busy=false,cooldown=0,retry=null,renderedCampaignId=null,renderedHistoryCount=0;
const OPENING='Rain beads on your cloak. Ahead, Blackthorn huddles beneath a ruined abbey. Its bell tower has no bell.\n\nA woman waits beside the road with a lantern and a child’s muddy shoe. “They walked out of the graves,” she says. “My daughter followed them.”\n\nTo the west, a river road leads towards the trading town of Greyhaven. North, an old forest swallows the king’s highway. Somewhere under the abbey, a bell begins to sound.\n\nThe road is yours. What do you do?';
const safeArray=(value,fallback=[])=>Array.isArray(value)&&value.every(item=>typeof item==='string')?value:fallback;
function readSavedCampaign(){
  let raw=null;try{raw=localStorage.getItem(storageKey)}catch{return null}
  const parsed=V.parseCampaign(raw);if(parsed)return parsed;
  if(raw)try{localStorage.removeItem(storageKey)}catch{}
  return null;
}
campaign=readSavedCampaign();
function selectLabel(id,value,fallback){const option=[...($(id)?.options||[])].find(item=>item.value===value);return option?.textContent||fallback}
function safeList(items,target){target.replaceChildren();for(const value of items||[]){if(typeof value!=='string')continue;const p=document.createElement('p');p.textContent=value;target.append(p)}}
function logEntry(title,text,kind='story'){const div=document.createElement('div');div.className='entry '+kind;const h=document.createElement('h4');h.textContent=title;const p=document.createElement('p');p.textContent=text;div.append(h,p);return div}
function codex(title,sections){
  $('codexTitle').textContent=title;$('codexBody').replaceChildren();
  for(const section of sections){
    const wrap=document.createElement('section'),heading=document.createElement('h3');heading.textContent=section.title;wrap.append(heading);
    const values=Array.isArray(section.lines)?section.lines:[section.lines];
    if(!values.length){const p=document.createElement('p');p.className='small';p.textContent='Nothing recorded yet.';wrap.append(p)}
    else for(const line of values){const p=document.createElement('p');p.textContent=line;wrap.append(p)}
    $('codexBody').append(wrap);
  }
  $('codex').showModal();
}
function localCommand(raw){
  const state=campaign?.state;if(!state)return false;const command=raw.trim().toLowerCase().split(/\s+/)[0],character=G.classes[state.cls];if(!command.startsWith('/'))return false;
  const conditions=safeArray(state.conditions),deathSaves=state.deathSaves||{successes:0,failures:0,stable:false,defeated:false};
  if(command==='/help')codex('Local commands',[{title:'Commands',lines:['/sheet — character identity, stats and conditions','/map — current place, danger and nearby routes','/quests — active quest log','/inventory — gear, potions, gold and class resources','/journal — durable facts, factions and significant events','/recap — campaign memory plus recent turns','These commands are local and do not spend a Groq turn.']}]);
  else if(command==='/sheet'||command==='/status')codex(`${state.name} · character sheet`,[{title:'Identity',lines:[`Level ${state.level} ${selectLabel('origin',state.origin,'Human')} ${character.name} · ${selectLabel('background',state.background,'Outlander')}`,state.backstory||'No backstory recorded.',state.goal?`Goal: ${state.goal}`:'No personal goal recorded.',`Tone: ${selectLabel('tone',state.tone,'Balanced adventure')}`]},{title:'Vitals',lines:[`HP ${state.hp}/${state.maxHp} · AC ${state.ac} · ${state.xp} XP`,...Object.entries(character.stats).map(([key,value])=>`${key} ${value>=0?'+':''}${value}`),conditions.length?`Conditions: ${conditions.join(', ')}`:'Conditions: none',state.hp===0?`Death saves: ${deathSaves.successes} successes / ${deathSaves.failures} failures`:null].filter(Boolean)},{title:'Class ability',lines:[character.ability]}]);
  else if(command==='/map'||command==='/location')codex('Map & routes',[{title:state.location,lines:[`${state.time} · ${String(state.danger||'tense').toUpperCase()}`,...(safeArray(state.exits).length?safeArray(state.exits):safeArray(state.places).slice(0,4)).map(route=>'→ '+route)]},{title:'Discovered places',lines:safeArray(state.places)}]);
  else if(command==='/quests')codex('Quest log',[{title:'Active threads',lines:safeArray(state.quests)}]);
  else if(command==='/inventory')codex('Inventory',[{title:'Resources',lines:[`${state.potions} healing potion${state.potions===1?'':'s'} · ${state.gold} gold`,state.cls==='wizard'?`${state.slots}/3 spell slots`:null,state.cls==='fighter'?`Second Wind ${state.secondWindReady===false?'spent':'ready'}`:null].filter(Boolean)},{title:'Pack',lines:safeArray(state.inventory)}]);
  else if(command==='/journal')codex('Campaign journal',[{title:'Durable facts',lines:safeArray(state.facts)},{title:'Significant events',lines:safeArray(state.journalEvents)},{title:'Factions',lines:safeArray(state.factions)},{title:'People',lines:safeArray(state.npcs)}]);
  else if(command==='/recap')codex('Story so far',[{title:'Campaign memory',lines:[state.memory||'No recap yet.']},{title:'Recent turns',lines:state.history.slice(-3).flatMap(entry=>[`${state.name}: ${entry.action}`,`DM: ${entry.narrative}`])}]);
  else codex('Unknown command',[{title:'Try one of these',lines:['/help · /sheet · /map · /quests · /inventory · /journal · /recap']}]);
  return true;
}
function renderStory(state){
  const story=$('story'),history=state.history||[],needsReset=renderedCampaignId!==state.id||renderedHistoryCount>history.length||story.childElementCount===0;
  const wasNearBottom=story.scrollHeight-story.scrollTop-story.clientHeight<90;
  if(needsReset){story.replaceChildren(logEntry('The Dungeon Master',typeof state.prologue==='string'&&state.prologue.trim()?state.prologue:OPENING));renderedCampaignId=state.id;renderedHistoryCount=0}
  for(const entry of history.slice(renderedHistoryCount))story.append(logEntry(state.name,entry.action,'action'),logEntry('The Dungeon Master',entry.narrative));
  renderedHistoryCount=history.length;
  if(wasNearBottom||needsReset)story.scrollTop=story.scrollHeight;
}
function renderStats(character){
  $('stats').replaceChildren();for(const [key,value] of Object.entries(character.stats)){const div=document.createElement('div'),bold=document.createElement('b');div.textContent=key;bold.textContent=(value>=0?'+':'')+value;div.append(bold);$('stats').append(div)}
}
function renderConditions(state){
  const conditions=safeArray(state.conditions),deathSaves=state.deathSaves||{successes:0,failures:0};$('conditions').replaceChildren();
  if(conditions.length)for(const condition of conditions){const span=document.createElement('span');span.textContent=condition;$('conditions').append(span)}else{const span=document.createElement('span');span.className='clear';span.textContent='No conditions';$('conditions').append(span)}
  if(state.hp===0){const span=document.createElement('span');span.className='dangerchip';span.textContent=`Death saves ${deathSaves.successes||0}/${deathSaves.failures||0}`;$('conditions').append(span)}
}
function render(){
  const state=campaign?.state;$('creation').hidden=!!state;$('game').hidden=!state;if(!state)return;
  const character=G.classes[state.cls],windReady=state.cls==='fighter'&&state.secondWindReady!==false;
  $('heroName').textContent=state.name;$('heroClass').textContent=`LEVEL ${state.level} ${character.name.toUpperCase()} · ${state.xp} XP`;$('identity').textContent=`${selectLabel('origin',state.origin,'Human')} · ${selectLabel('background',state.background,'Outlander')} · ${selectLabel('tone',state.tone,'Balanced adventure')}`;
  $('hp').textContent=state.hp+' / '+state.maxHp;$('ac').textContent=state.ac;$('health').style.width=Math.max(0,Math.min(100,state.hp/state.maxHp*100))+'%';renderStats(character);renderConditions(state);
  $('pack').replaceChildren();const count=document.createElement('p');count.textContent=`${state.potions} potions · ${state.gold} gold`+(state.cls==='wizard'?` · ${state.slots}/3 spell slots`:'')+(state.cls==='fighter'?` · Second Wind ${windReady?'ready':'spent'}`:'');$('pack').append(count);for(const item of state.inventory){const p=document.createElement('p');p.textContent=item;$('pack').append(p)}
  $('abilities').textContent=state.cls==='wizard'?'Fire Bolt is a cantrip. Levelled spells consume a slot. Magic Missile automatically hits with server-rolled damage. A long rest restores slots.':state.cls==='rogue'?'Use stealth, misdirection and precise attacks. Advantage can enable server-rolled sneak damage. Your background may grant proficiency when it fits the fiction.':'Use your strength, armour and longsword. Second Wind restores 1d10 + 2 HP once and refreshes after a successful rest. Successful attacks roll damage on the server.';
  $('journal').replaceChildren();for(const quest of state.quests){const item=document.createElement('li');item.textContent=quest;$('journal').append(item)}
  safeList(safeArray(state.exits).length?safeArray(state.exits):safeArray(state.places).slice(0,4),$('routes'));safeList([...safeArray(state.npcs),...safeArray(state.factions),...safeArray(state.places)],$('worldnotes'));safeList([...safeArray(state.facts),...safeArray(state.journalEvents).slice(-6)],$('facts'));
  $('chapter').textContent=state.location;$('chapterNo').textContent=`TURN ${state.turn} · ${String(state.danger||'tense').toUpperCase()}`;renderStory(state);
  $('enemy').hidden=true;const roll=state.lastRoll;$('dice').textContent=roll?.die||'d20';$('roll').textContent=roll&&Array.isArray(roll.dice)?`${roll.ability} · [${roll.dice.join(', ')}] ${roll.modifier>=0?'+':''}${roll.modifier} = ${roll.total} / DC ${roll.dc} · ${roll.success?'SUCCESS':'FAILURE'}${roll.critical?' · CRITICAL':''}${state.lastDamage?` · ${state.lastDamage} DAMAGE`:''}`:state.time;
  $('choices').replaceChildren();for(const suggestion of state.suggestions){const button=document.createElement('button');button.textContent=suggestion;button.onclick=()=>run(suggestion);button.disabled=busy||Date.now()<cooldown;$('choices').append(button)}
  $('potion').disabled=busy||!state.potions||state.hp>=state.maxHp;$('wind').hidden=state.cls!=='fighter';$('wind').disabled=busy||state.hp>=state.maxHp||!windReady;$('rest').disabled=busy;$('newgame').disabled=busy;$('input').disabled=busy;$('command').querySelector('button').disabled=busy;
  try{localStorage.setItem(storageKey,JSON.stringify(campaign));$('savestatus').textContent='PROGRESS SAVED ON THIS DEVICE'}catch{$('savestatus').textContent='SAVE UNAVAILABLE · KEEP THIS TAB OPEN'}
}
async function call(body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),105000);
  try{
    const response=await fetch('/api/turn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    let data;try{data=await response.json()}catch{throw new Error('The dungeon master did not return a readable response. Your save is unchanged.')}
    if(!response.ok){if(data.retryAfter)cooldown=Date.now()+data.retryAfter*1000;throw new Error(data.error||'The dungeon master is unavailable. Please try again.')}
    if(!V.validCampaign(data))throw new Error('The returned turn was incomplete. Your previous save is safe.');return data;
  }finally{clearTimeout(timer)}
}
async function run(action){
  action=action.trim();if(!campaign||busy||!action)return;if(localCommand(action)){$('input').value='';return}
  if(Date.now()<cooldown){$('turnstatus').textContent=`The DM needs ${Math.ceil((cooldown-Date.now())/1000)} more seconds. Your action is still in the box.`;return}
  busy=true;render();$('turnstatus').textContent=safeArray(campaign.state.conditions).includes('unconscious')?'Fate turns the die…':'The dungeon master considers your action…';
  const before=campaign,save=campaign.save,requestId=retry?.action===action&&retry?.save===save?retry.requestId:crypto.randomUUID();retry={action,save,requestId};const statusTimer=setTimeout(()=>{$('turnstatus').textContent='Rolling the dice and weaving the consequences…'},5000);
  try{const result=await call({action,save,requestId});window.AstraExtras?.captureUndo(before,result);campaign={state:result.state,save:result.save};retry=null;$('input').value='';$('turnstatus').textContent=''}
  catch(error){$('input').value=action;$('turnstatus').textContent=error.name==='AbortError'?'The turn took too long. Your save is unchanged. Try the action again.':error.message}
  finally{clearTimeout(statusTimer);busy=false;render()}
}
$('heroform').onsubmit=async event=>{
  event.preventDefault();if(busy)return;busy=true;const button=event.target.querySelector('button[type="submit"]');button.disabled=true;$('availability').textContent='Preparing your campaign…';
  try{const result=await call({start:true,name:$('name').value,cls:new FormData(event.target).get('class'),origin:$('origin').value,background:$('background').value,tone:$('tone').value,backstory:$('backstory').value,goal:$('goal').value});window.AstraExtras?.clearUndo();campaign={state:result.state,save:result.save};renderedCampaignId=null;render();$('game').scrollIntoView({behavior:'smooth',block:'start'})}
  catch(error){$('availability').textContent=error.message}finally{busy=false;button.disabled=false;render()}
};
$('command').onsubmit=event=>{event.preventDefault();run($('input').value)};$('potion').onclick=()=>run('I drink one of my healing potions.');$('wind').onclick=()=>run('I use Second Wind to steady myself and recover.');$('rest').onclick=()=>run('I look for a safe place and take a short rest.');$('map').onclick=()=>localCommand('/map');$('recap').onclick=()=>localCommand('/recap');$('sheet').onclick=()=>localCommand('/sheet');
$('newgame').onclick=()=>{if(busy||!confirm('Begin a new campaign? This replaces your open-world save.'))return;campaign=null;retry=null;renderedCampaignId=null;window.AstraExtras?.clearUndo();try{localStorage.removeItem(storageKey)}catch{}render();window.scrollTo({top:0,behavior:'smooth'})};
for(const id of ['rules','credits'])$(id).onclick=()=>$('modal').showModal();$('close').onclick=()=>$('modal').close();$('codexClose').onclick=()=>$('codex').close();render();
fetch('/api/turn').then(response=>response.json()).then(data=>{$('availability').textContent=data.configured?'The dungeon master is ready.':'Open-world mode is awaiting server configuration. You can still play the original adventure below.'}).catch(()=>{$('availability').textContent='Could not reach the dungeon master. Please try again shortly.'});
setInterval(()=>{if(cooldown&&Date.now()>=cooldown){cooldown=0;if(!busy){$('turnstatus').textContent='Ready when you are. Try your action again.';render()}}},1000);
