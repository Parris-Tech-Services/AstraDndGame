'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const packageJson = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const workflow = read('.github/workflows/qa.yml');
const vercel = JSON.parse(read('vercel.json'));
const index = read('dist/index.html');
const serviceWorker = read('dist/sw.js');
const extras = read('dist/extras.js');
const turnApi = read('api/turn.js');
const tacticalApi = read('api/tactical.js');
const principles = read('docs/CODE_PRINCIPLES.md');
const audit = read('docs/PRINCIPLES_AUDIT.md');

assert.equal(packageJson.version, lock.version, 'package and lockfile versions must match');
assert.equal(packageJson.version, lock.packages[''].version, 'root lock package version must match package.json');
for (const [name, version] of Object.entries(packageJson.devDependencies || {})) {
  assert(!/[~^*xX]|latest/.test(version), `dependency ${name} must be exactly pinned`);
}

assert.match(workflow, /npm ci/);
assert(!workflow.includes('@latest'), 'CI must not install floating latest tooling');
assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/);
assert.match(workflow, /'audit\/\*\*'/);

assert.equal(vercel.installCommand, 'npm ci');
assert.equal(vercel.buildCommand, 'npm run build', 'Vercel preview builds should run deterministic build sanity, not duplicate the full QA suite');
assert.equal(packageJson.scripts.build, 'node qa/build-sanity.cjs');
const headers = vercel.headers.flatMap(entry => entry.headers || []);
assert(headers.some(header => header.key === 'Content-Security-Policy'));
assert(headers.some(header => header.key === 'Permissions-Policy'));
assert(headers.some(header => header.key === 'X-Frame-Options'));

const validationPos = index.indexOf('state-validation.js');
const extrasPos = index.indexOf('extras.js');
const worldPos = index.indexOf('world.js');
const tacticalPos = index.indexOf('aidm-port.js');
assert(
  validationPos > 0 && validationPos < extrasPos && validationPos < worldPos && validationPos < tacticalPos,
  'campaign validation must load before state-consuming UI modules'
);
assert(serviceWorker.includes('state-validation.js'), 'offline shell must cache the campaign validator');

assert(!/window\.fetch\s*=/.test(extras), 'campaign tools must not intercept global fetch');
assert(turnApi.includes('validRequestId'));
assert(tacticalApi.includes('validRequestId'));
assert(!turnApi.includes('providerMessage'), 'provider diagnostics must not log provider text');

for (const folder of ['api', 'server']) {
  for (const file of fs.readdirSync(path.join(root, folder)).filter(name => /\.(?:js|cjs)$/.test(name))) {
    const source = read(`${folder}/${file}`);
    assert(!source.includes("require('../dist/"), `${folder}/${file} must not depend on browser implementation`);
  }
}

const productionFiles = ['api', 'server', 'dist'].flatMap(folder =>
  fs.readdirSync(path.join(root, folder))
    .filter(name => /\.(?:js|cjs|html)$/.test(name))
    .map(name => `${folder}/${name}`)
);
for (const file of productionFiles) {
  assert(!/gsk_[A-Za-z0-9]{20,}/.test(read(file)), `provider credential pattern found in ${file}`);
}

const serverClasses = require('../server/classes.cjs');
const clientClasses = require('../dist/engine.js').classes;
for (const cls of Object.keys(serverClasses)) {
  for (const key of ['hp', 'ac', 'attack', 'die', 'damage', 'weapon']) {
    assert.deepEqual(clientClasses[cls][key], serverClasses[cls][key], `${cls}.${key} drifted between classic presentation and server domain`);
  }
  assert.deepEqual(clientClasses[cls].stats, serverClasses[cls].stats, `${cls} stats drifted between client and server`);
}

const rules = require('../server/rules.cjs');
function selectValues(id) {
  const match = index.match(new RegExp(`<select id="${id}">([\\s\\S]*?)<\\/select>`));
  assert(match, `missing ${id} select`);
  return [...match[1].matchAll(/<option value="([^"]+)"/g)].map(item => item[1]);
}
assert.deepEqual(selectValues('origin'), Object.keys(rules.ORIGINS));
assert.deepEqual(selectValues('background'), Object.keys(rules.BACKGROUNDS));
assert.deepEqual(selectValues('tone'), Object.keys(rules.TONES));

for (let number = 1; number <= 26; number++) {
  assert(new RegExp(`(?:^|\\n)${number}\\. \\*\\*`).test(principles), `engineering principle ${number} is missing`);
}
assert.match(audit, /Scope and honesty note/);

assert.match(index, /role="log" aria-live="polite"/);
assert.match(read('dist/style.css'), /prefers-reduced-motion/);
assert(packageJson.scripts.test.includes('qa/tactical-api.cjs'));
assert(packageJson.scripts.test.includes('qa/principles.cjs'));

console.log('Principles QA passed: reproducible builds, security boundaries, source-of-truth checks, accessibility gates and all 26 engineering principles are present.');
