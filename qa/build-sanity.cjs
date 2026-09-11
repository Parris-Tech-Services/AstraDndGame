'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'dist/index.html',
  'dist/classic.html',
  'dist/world.js',
  'dist/state-validation.js',
  'dist/style.css',
  'dist/manifest.webmanifest',
  'api/turn.js',
  'api/tactical.js',
  'server/world.cjs',
  'server/tactical.cjs',
  'server/secret.cjs'
];

for (const file of requiredFiles) {
  const absolute = path.join(root, file);
  assert(fs.existsSync(absolute), `required deployment file is missing: ${file}`);
  assert(fs.statSync(absolute).size > 0, `required deployment file is empty: ${file}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist/manifest.webmanifest'), 'utf8'));
assert.equal(typeof manifest.name, 'string', 'PWA manifest must have a name');

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
assert.equal(vercel.outputDirectory, 'dist', 'Vercel must publish dist');
assert.equal(vercel.installCommand, 'npm ci', 'Vercel installs must be reproducible');

console.log(`Build sanity passed: ${requiredFiles.length} required deployment files are present and deployment config is valid.`);
