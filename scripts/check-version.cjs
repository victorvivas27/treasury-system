const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const version = read('VERSION').trim();
assert.match(version, /^\d+\.\d+\.\d+$/);
assert.equal(JSON.parse(read('frontend/package.json')).version, version, 'Frontend desincronizado');
assert.equal(read('backend/build.gradle').match(/^version = '([^']+)'/m)?.[1], version, 'Backend desincronizado');
const manifest = JSON.parse(read('.release-please-manifest.json'));
if (manifest['.']) {
  assert.equal(manifest['.'], version, 'Manifest desincronizado');
  assert.ok(read('CHANGELOG.md').includes(`## ${version}`) || read('CHANGELOG.md').includes(`## [${version}]`), 'Falta la versión en CHANGELOG');
} else {
  assert.equal(version, JSON.parse(read('release-please-config.json')).packages['.']['initial-version']);
}
console.log(`Versiones sincronizadas: v${version}`);
