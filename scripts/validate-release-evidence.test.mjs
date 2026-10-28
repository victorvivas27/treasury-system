import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { currentFingerprint } from './ci-validation.cjs';
import { validateReleaseEvidence } from './validate-release-evidence.mjs';

test('release gate verifies both exact snapshots and rejects tampering and foreign runs', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'treasury-release-evidence-'));
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const keys = { frontend: currentFingerprint('frontend'), backend: currentFingerprint('backend') };
  const context = { sha, workflowRunId: '42', keys };
  const json = (file, value) => writeFileSync(file, JSON.stringify(value));
  try {
    for (const suite of ['frontend', 'backend']) {
      const source = path.join(directory, suite);
      const coverage = path.join(source, 'allure/coverage');
      mkdirSync(coverage, { recursive: true });
      mkdirSync(path.join(source, 'allure/allure-results'));
      writeFileSync(path.join(source, 'index.html'), '<html>Coverage</html>');
      writeFileSync(path.join(coverage, 'detail.html'), 'verified snapshot');
      const digest = data => createHash('sha256').update(data).digest('hex');
      const manifest = JSON.stringify([{ file: 'detail.html', sha256: digest('verified snapshot') }]);
      writeFileSync(path.join(coverage, 'manifest.json'), manifest);
      const counts = { total: 3, passed: 3, failed: 0, skipped: 0, todo: 0 };
      const record = { application: suite, suite: 'combined', scope: 'complete', sha, runId: 'run',
        dirty: false, exitCode: 0, runnerExitCode: 0,
        counts: { matches: true, reportMatches: true, runner: counts },
        coverage: { status: 'available', manifestSha256: digest(manifest), application: suite,
          sha, runId: 'run', suite: 'combined', scope: 'complete', dirty: false,
          metrics: { lines: { covered: 2, total: 3, percent: 66.67 } } } };
      json(path.join(source, 'allure/run.json'), record);
      json(path.join(source, 'receipt.json'), { schema: 1, application: suite, suite: 'combined',
        valid: true, sha, fingerprint: keys[suite], workflowRunId: '42', runId: 'run',
        tests: counts, coverage: record.coverage });
    }
    assert.doesNotThrow(() => validateReleaseEvidence(directory, context));
    assert.throws(() => validateReleaseEvidence(directory, { ...context, workflowRunId: '43' }), /Invalid/);
    assert.throws(() => validateReleaseEvidence(directory, { ...context, sha: 'f'.repeat(40) }), /Invalid/);
    assert.throws(() => validateReleaseEvidence(directory, {
      ...context, keys: { ...keys, frontend: 'f'.repeat(64) },
    }), /Changed frontend release inputs/);
    writeFileSync(path.join(directory, 'backend/allure/coverage/detail.html'), 'tampered');
    assert.throws(() => validateReleaseEvidence(directory, context), /snapshot integrity/);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('treasury-release-evidence-'));
    rmSync(directory, { recursive: true, force: true });
  }
});
