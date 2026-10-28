import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentFingerprint, validateEvidence } from './ci-validation.cjs';
import { prepareCoverageReport } from './allure-coverage.mjs';

export function validateReleaseEvidence(directory, { sha, workflowRunId, keys }) {
  const read = file => JSON.parse(readFileSync(file, 'utf8'));
  for (const suite of ['frontend', 'backend']) {
    const source = path.join(directory, suite);
    const receipt = read(path.join(source, 'receipt.json'));
    const run = path.join(source, 'allure');
    const record = read(path.join(run, 'run.json'));
    if (keys[suite] !== currentFingerprint(suite)) throw new Error(`Changed ${suite} release inputs`);
    validateEvidence({ suite, key: keys[suite], sha, workflowRunId, receipt, record });
    prepareCoverageReport(run, record); // Verify the captured coverage manifest and every snapshot hash.
    if (!statSync(path.join(source, 'index.html')).isFile()) throw new Error(`Missing ${suite} coverage HTML`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Expected evidence directory');
  validateReleaseEvidence(process.argv[2], {
    sha: process.env.RELEASE_SHA,
    workflowRunId: process.env.GITHUB_RUN_ID,
    keys: { frontend: process.env.FRONTEND_KEY, backend: process.env.BACKEND_KEY },
  });
}
