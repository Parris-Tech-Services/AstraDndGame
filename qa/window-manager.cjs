'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const manager = fs.readFileSync(path.resolve(__dirname, '../dist/window-manager.js'), 'utf8');
const css = fs.readFileSync(path.resolve(__dirname, '../dist/window-manager-mobile.css'), 'utf8');

function createDom(width = 1280) {
  const dom = new JSDOM('<!doctype html><header></header><main id="game"><aside><h2>Hero</h2></aside><article><div id="story">Story</div><form id="command"><input id="input"></form></article><section id="aidmPort">Map</section></main>', { url: 'http://game.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.innerWidth = width;
  window.matchMedia = () => ({ matches: width <= 760, addEventListener() {}, removeEventListener() {} });
  window.eval(manager);
  return dom;
}

const desktop = createDom();
const panels = desktop.window.document.querySelectorAll('.window-panel');
assert.equal(panels.length, 3, 'story, character sheet, and map are managed panels');
assert.equal(desktop.window.document.querySelector('[data-window-id="map"]').dataset.windowId, 'map');
const story = desktop.window.document.querySelector('[data-window-id="story"]');
const titlebar = story.querySelector('.window-titlebar');
assert.equal(titlebar.getAttribute('tabindex'), '0', 'title bar is keyboard focusable');
assert.equal(story.querySelectorAll('.window-resize').length, 8, 'panel has edge and corner resize handles');
assert.match(desktop.window.localStorage.getItem('astra-window-layout-v1'), /"version":1/);

story.querySelector('[data-window-action="minimize"]').click();
assert(story.classList.contains('is-minimized'), 'minimize state is applied');
story.querySelector('[data-window-action="maximize"]').click();
assert(story.classList.contains('is-maximized'), 'maximize state is applied');
assert(Number(story.style.zIndex) > 1, 'active window receives focus z-index');

desktop.window.document.querySelector('#reset-layout').click();
assert.equal(desktop.window.localStorage.getItem('astra-window-layout-v1'), JSON.stringify({ version: 1, panels: {} }), 'reset writes an empty versioned layout');
desktop.window.close();

const corrupt = new JSDOM('<!doctype html><header></header><main id="game"><aside></aside><article></article></main>', { url: 'http://game.test/', runScripts: 'outside-only', pretendToBeVisual: true });
corrupt.window.localStorage.setItem('astra-window-layout-v1', '{broken');
corrupt.window.innerWidth = 1280;
corrupt.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
corrupt.window.eval(manager);
assert.equal(JSON.parse(corrupt.window.localStorage.getItem('astra-window-layout-v1')).version, 1, 'corrupt layouts recover to the current version');
corrupt.window.close();

assert.match(css, /@media \(max-width:760px\)/, 'mobile layout mode exists');
assert.match(css, /window-panel\[data-window-id="story"\].*order:-3/, 'mobile layout promotes story first');
assert.match(css, /window-resize\{display:none\}/, 'mobile layout disables floating resize handles');

console.log('Window manager QA passed: three managed panels, versioned persistence, controls, focus, recovery, and mobile story-first rules.');
