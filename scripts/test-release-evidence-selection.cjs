const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectEvidence } = require('./select-release-evidence.cjs');
const sha = 'a'.repeat(40);
const valid = { validated_sha: sha, frontend_artifact: '123', backend_artifact: '456', frontend_key: 'b'.repeat(64), backend_key: 'c'.repeat(64) };

test('manual validation runs fresh suites; complete evidence selects reuse', () => {
  assert.deepEqual(selectEvidence(sha, {}), { sha, reuse: 'false' });
  const { validated_sha, ...artifacts } = valid;
  assert.deepEqual(selectEvidence(sha, valid), { sha, reuse: 'true', ...artifacts });
});

test('partial, malformed and foreign-commit evidence fails instead of bypassing tests', () => {
  for (const field of Object.keys(valid)) {
    const partial = { ...valid };
    delete partial[field];
    assert.throws(() => selectEvidence(sha, partial));
  }
  for (const invalid of [{ validated_sha: 'd'.repeat(40) }, { frontend_artifact: '123\nreuse=true' }, { frontend_key: 'bad' }, { backend_artifact: '123' }]) {
    assert.throws(() => selectEvidence(sha, { ...valid, ...invalid }));
  }
});

test('shared evidence skips heavy suites and still requires successful integrity verification', () => {
  const { createRequire } = require('node:module');
  const path = require('node:path');
  const fs = require('node:fs');
  const yaml = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'))('yaml');
  const gate = yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows/12-release-validation.yml'), 'utf8'));
  for (const suite of ['frontend', 'backend']) {
    const shouldRun = new Function('needs', 'return ' + gate.jobs[suite].if);
    assert.equal(shouldRun({ resolve: { outputs: { reuse: 'true' } } }), false);
    assert.equal(shouldRun({ resolve: { outputs: { reuse: 'false' } } }), true);
  }
  const eligible = new Function('needs', 'always', 'cancelled', 'return ' + gate.jobs.evidence.if);
  for (const [reuse, frontend, backend, expected] of [
    ['true', 'skipped', 'skipped', true],
    ['false', 'success', 'success', true],
    ['false', 'failure', 'success', false],
    ['false', 'skipped', 'skipped', false],
    ['true', 'failure', 'skipped', false],
  ]) {
    const needs = { resolve: { result: 'success', outputs: { reuse } }, 'protected-files': { result: 'success' }, frontend: { result: frontend }, backend: { result: backend } };
    assert.equal(eligible(needs, () => true, () => false), expected);
    assert.equal(eligible(needs, () => true, () => true), false);
    needs.resolve.result = 'failure';
    assert.equal(eligible(needs, () => true, () => false), false);
  }
  const steps = gate.jobs.evidence.steps;
  assert.ok(steps.some(step => step.run === 'node scripts/validate-release-evidence.mjs evidence'));
  for (const download of steps.filter(step => step.uses === 'actions/download-artifact@v8')) {
    assert.equal(download.with['run-id'], '${{ github.run_id }}');
  }
});
