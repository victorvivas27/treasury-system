const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const suites = new Set(['frontend', 'backend', 'bruno', 'versioning']);
const workflows = new Set(['00-pr-validation.yml', '02-frontend-ci.yml', '03-backend-ci.yml',
  '04-bruno-tests.yml', '05-versioning-ci.yml', '10-sync-main-dev.yml',
  '07-deploy-backend.yml', '08-deploy-frontend.yml', '09-reports-pages.yml',
  '11-publish-allure.yml', '12-release-validation.yml']);

// Hash tracked blobs, file modes and paths, not commit IDs. A merge with identical
// inputs can reuse validation; changed application code or CI tooling cannot.
function fingerprint(suite, listing) {
  if (!suites.has(suite)) throw new Error(`Unknown validation suite: ${suite}`);
  const entries = listing.split('\0').filter(Boolean).filter(entry => {
    const file = entry.slice(entry.indexOf('\t') + 1);
    if (file.startsWith('.github/') || file.startsWith('scripts/')) return true;
    if (!file.includes('/')) return true;
    if (file.startsWith('frontend/')) return suite === 'frontend' || (suite === 'backend' &&
      ['frontend/package.json', 'frontend/pnpm-lock.yaml', 'frontend/pnpm-workspace.yaml'].includes(file)) || (suite === 'versioning' &&
      (file === 'frontend/package.json' || file.startsWith('frontend/.commitlintrc')));
    if (file.startsWith('backend/')) return suite === 'backend' || suite === 'bruno' ||
      (suite === 'versioning' && file === 'backend/build.gradle');
    if (file.startsWith('api-tests/')) return suite === 'bruno';
    if (file.startsWith('docs/architecture/modules/01-auth-security/') && file.endsWith('.html')) {
      return suite === 'backend' || suite === 'bruno';
    }
    // Unknown configuration directories are shared inputs, not silently ignored.
    return !file.startsWith('docs/') && !file.startsWith('.agents/');
  }).sort();
  const version = ['frontend', 'backend'].includes(suite) ? 3 : 1;
  return createHash('sha256').update(`validation-v${version}:${suite}\0${entries.join('\0')}`).digest('hex');
}

function currentFingerprint(suite) {
  return fingerprint(suite, execFileSync('git', ['ls-tree', '-rz', '--full-tree', 'HEAD'], { encoding: 'utf8' }));
}

// Release consumers use evidence produced by successful prerequisite jobs, not
// an artifact search racing against completion of the enclosing workflow.
function validateEvidence({ suite, key, sha, workflowRunId, receipt, record }) {
  if (!['frontend', 'backend'].includes(suite) || !/^[a-f0-9]{64}$/.test(key) ||
      !/^[a-f0-9]{40}$/.test(sha) || !/^\d+$/.test(String(workflowRunId)) ||
      receipt.schema !== 1 || receipt.valid !== true || receipt.application !== suite ||
      receipt.suite !== 'combined' || receipt.sha !== sha || receipt.fingerprint !== key ||
      String(receipt.workflowRunId) !== String(workflowRunId) || !receipt.runId ||
      receipt.runId !== record.runId || record.sha !== sha || record.dirty !== false ||
      record.application !== suite || record.suite !== 'combined' || record.scope !== 'complete' ||
      record.exitCode !== 0 || record.runnerExitCode !== 0 || !record.counts?.matches ||
      !record.counts?.reportMatches || record.coverage?.status !== 'available' ||
      receipt.coverage?.status !== 'available') throw new Error(`Invalid ${suite} release evidence`);
  for (const coverage of [record.coverage, receipt.coverage]) {
    if (coverage.sha !== sha || coverage.runId !== record.runId || coverage.application !== suite ||
        coverage.suite !== 'combined' || coverage.scope !== 'complete' || coverage.dirty !== false ||
        !/^[a-f0-9]{64}$/.test(coverage.manifestSha256) ||
        coverage.manifestSha256 !== record.coverage.manifestSha256) {
      throw new Error(`Unattributed ${suite} coverage snapshot`);
    }
  }
  for (const counts of [receipt.tests, record.counts.runner]) {
    if (!Number.isInteger(counts?.total) || counts.total <= 0 || counts.passed !== counts.total ||
        counts.failed !== 0 || counts.skipped !== 0 || (counts.todo ?? 0) !== 0) {
      throw new Error(`Unsuccessful ${suite} release tests`);
    }
  }
  if (receipt.tests.total !== record.counts.runner.total) throw new Error(`Mismatched ${suite} test counts`);
}

async function findArtifact({ github, context, suite, key }) {
  const name = `${suite}-validation-${key}`;
  const runs = new Map();
  // Search all matching artifacts: an unsuccessful new run must not hide an
  // older successful run with the same inputs. Expired receipts are cache misses.
  for await (const page of github.paginate.iterator(github.rest.actions.listArtifactsForRepo, {
    ...context.repo, name, per_page: 100,
  })) {
    for (const artifact of page.data) {
      if (artifact.name !== name || artifact.expired || !artifact.workflow_run?.id) continue;
      const id = artifact.workflow_run.id;
      if (!runs.has(id)) {
        const { data: run } = await github.rest.actions.getWorkflowRun({ ...context.repo, run_id: id });
        runs.set(id, run);
      }
      const run = runs.get(id);
      const file = run.path?.split('@')[0].split('/').pop();
      if (run.status === 'completed' && run.conclusion === 'success' && workflows.has(file) &&
          run.head_repository?.full_name === `${context.repo.owner}/${context.repo.repo}`) return artifact;
    }
  }
  return null;
}

module.exports = { fingerprint, currentFingerprint, findArtifact, validateEvidence };
