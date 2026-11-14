'use strict';
// The podcast launcher must be hidden by default and only appear after the player opts in.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync(path.resolve(__dirname,'../dist/podcast-player.js'),'utf8');
function load(stored){
  const dom=new JSDOM('<body><div id="astraSettings"><button id="fullscreen">Fullscreen</button></div></body>',{url:'http://game.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  if(stored!==undefined)w.localStorage.setItem('astra-podcast-visible-v1',stored);
  w.eval(code);
  return w;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  let w=load();await wait(500);
  assert.equal(w.document.querySelector('#astra-podcast-launcher'),null,'podcast launcher must be hidden on a first visit');
  const box=w.document.querySelector('#prefPodcasts');
  assert.ok(box,'Settings must offer a podcast toggle');
  assert.equal(box.checked,false,'podcast toggle must default to off');
  box.checked=true;box.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.ok(w.document.querySelector('#astra-podcast-launcher'),'turning the toggle on must show the launcher');
  assert.equal(w.localStorage.getItem('astra-podcast-visible-v1'),'true');
  w=load('true');await wait(500);
  assert.ok(w.document.querySelector('#astra-podcast-launcher'),'a saved opt-in must be remembered');
  w=load('false');await wait(500);
  assert.equal(w.document.querySelector('#astra-podcast-launcher'),null,'a saved opt-out must be remembered');
  console.log('Podcast default QA passed: hidden by default, toggle opts in, choice persists.');
  process.exit(0);
})().catch(error=>{console.error(error);process.exit(1)});
