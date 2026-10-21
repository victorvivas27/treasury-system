const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validate, HISTORICAL_INVALID_SHA, HISTORICAL_INVALID_MESSAGE, PREVIOUS_LEGACY_SHA, PREVIOUS_LEGACY_MESSAGE } = require('./validate-commit-message.cjs');

test('accepts conventional types, scopes and breaking-change markers', () => {
  for (const message of ['feat: agregar módulo', 'fix(calendar): corregir horario', 'feat(api)!: cambiar contrato', 'build(frontend): actualizar bundle']) {
    assert.equal(validate(message), null, message);
  }
});

test('rejects malformed headers, unsupported types, uppercase scopes and invalid lengths', () => {
  for (const message of ['mensaje normal', 'feature: nueva sección', 'fix(MyScope): corregir bug', 'fix: ', `feat: ${'x'.repeat(196)}`]) {
    assert.ok(validate(message), message);
  }
});

test('accepts Git merge and revert messages like commitlint', () => {
  assert.equal(validate('Merge pull request #42 from org/branch'), null);
  assert.equal(validate('Revert "feat: add a feature"'), null);
});

test('grandfathers only the exact immutable published historical commit', () => {
  assert.equal(validate(HISTORICAL_INVALID_MESSAGE, { sha: HISTORICAL_INVALID_SHA }), null);
  assert.equal(validate(PREVIOUS_LEGACY_MESSAGE, { sha: PREVIOUS_LEGACY_SHA }), null);
  assert.ok(validate(HISTORICAL_INVALID_MESSAGE));
  assert.ok(validate(PREVIOUS_LEGACY_MESSAGE));
  assert.ok(validate(`${HISTORICAL_INVALID_MESSAGE} changed`, { sha: HISTORICAL_INVALID_SHA }));
  assert.ok(validate(HISTORICAL_INVALID_MESSAGE, { sha: '327163e000000000000000000000000000000000' }));
});

test('remote workflow validates commit messages with the SHA-aware validator', () => {
  const fs = require('node:fs');
  const workflow = fs.readFileSync(require('node:path').join(__dirname, '../.github/workflows/01-commit-lint.yml'), 'utf8');
  assert.match(workflow, /validate-commit-message\.cjs --range/);
  assert.doesNotMatch(workflow, /wagoid\/commitlint-github-action/);
});

test('hook setup points Git to the portable repository hook scripts', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const hooks = path.join(__dirname, '../.githooks');
  assert.match(fs.readFileSync(path.join(hooks, 'commit-msg'), 'utf8'), /validate-commit-message\.cjs/);
  assert.match(fs.readFileSync(path.join(hooks, 'pre-push'), 'utf8'), /git rev-list/);
});
