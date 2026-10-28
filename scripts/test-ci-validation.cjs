const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { fingerprint, currentFingerprint, findArtifact, validateEvidence } = require('./ci-validation.cjs');
const yaml = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'))('yaml');
const workflow = file => yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows', file), 'utf8'));
const listing = files => Object.entries(files).map(([file, blob]) => `100644 blob ${blob}\t${file}`).join('\0');
const inputs = { 'frontend/src/App.tsx': 'front', 'backend/src/App.java': 'back',
  'api-tests/test.yml': 'api', '.github/workflows/00-pr-validation.yml': 'workflow',
  'scripts/ci-validation.cjs': 'helper', 'VERSION': 'version', 'frontend/package.json': 'package',
  'backend/build.gradle': 'gradle', 'frontend/.commitlintrc.cjs': 'commit-config',
  'frontend/pnpm-workspace.yaml': 'workspace',
  'docs/architecture/modules/01-auth-security/login.html': 'diagram',
  '.githooks/commit-msg': 'hook' };

test('equal tracked inputs reuse validation across commit IDs and ordering', () => {
  for (const suite of ['frontend', 'backend', 'bruno', 'versioning']) {
    assert.equal(fingerprint(suite, listing(inputs)),
      fingerprint(suite, listing(Object.fromEntries(Object.entries(inputs).reverse()))));
    assert.match(currentFingerprint(suite), /^[a-f0-9]{64}$/);
  }
  assert.throws(() => fingerprint('unknown', ''), /Unknown/);
});

test('working directories do not change which repository inputs are fingerprinted', () => {
  const original = process.cwd();
  const rootKey = currentFingerprint('frontend');
  try {
    process.chdir(path.join(__dirname, '../frontend'));
    assert.equal(currentFingerprint('frontend'), rootKey);
  } finally {
    process.chdir(original);
  }
});

test('changes invalidate all affected suites, including deleted files and shared tooling', () => {
  const cases = {
    'frontend/src/App.tsx': ['frontend'],
    'backend/src/App.java': ['backend', 'bruno'],
    'api-tests/test.yml': ['bruno'],
    'frontend/package.json': ['frontend', 'backend', 'versioning'],
    'frontend/pnpm-workspace.yaml': ['frontend', 'backend'],
    'docs/architecture/modules/01-auth-security/login.html': ['backend', 'bruno'],
    'backend/build.gradle': ['backend', 'bruno', 'versioning'],
    'frontend/.commitlintrc.cjs': ['frontend', 'versioning'],
    '.githooks/commit-msg': ['frontend', 'backend', 'bruno', 'versioning'],
    '.github/workflows/00-pr-validation.yml': ['frontend', 'backend', 'bruno', 'versioning'],
    'scripts/ci-validation.cjs': ['frontend', 'backend', 'bruno', 'versioning'],
    'VERSION': ['frontend', 'backend', 'bruno', 'versioning'],
  };
  for (const [file, affected] of Object.entries(cases)) {
    for (const suite of ['frontend', 'backend', 'bruno', 'versioning']) {
      const original = fingerprint(suite, listing(inputs));
      const changed = fingerprint(suite, listing({ ...inputs, [file]: 'changed' }));
      const deleted = { ...inputs }; delete deleted[file];
      assert.equal(changed !== original, affected.includes(suite), `${suite}: ${file}`);
      assert.equal(fingerprint(suite, listing(deleted)) !== original, affected.includes(suite));
    }
  }
});

const context = { repo: { owner: 'owner', repo: 'repo' } };
const successful = { status: 'completed', conclusion: 'success',
  path: '.github/workflows/00-pr-validation.yml', head_repository: { full_name: 'owner/repo' } };
const artifact = (id, overrides = {}) => ({ id, name: 'frontend-validation-key', expired: false,
  workflow_run: { id }, ...overrides });
function fixture(pages, states = {}) {
  const queries = [], reads = [];
  const github = { rest: { actions: {
    listArtifactsForRepo: {},
    getWorkflowRun: async ({ run_id }) => { reads.push(run_id); return { data: states[run_id] ?? successful }; },
  } }, paginate: { iterator: async function* (_, query) {
    queries.push(query);
    for (const data of pages) yield { data };
  } } };
  return { queries, reads, find: () => findArtifact({ github, context, suite: 'frontend', key: 'key' }) };
}

test('only matching, unexpired artifacts from successful repository workflows are reusable', async () => {
  const f = fixture([[artifact(1)]]);
  assert.equal((await f.find()).id, 1);
  assert.equal(f.queries[0].name, 'frontend-validation-key');
  for (const invalid of [artifact(1, { expired: true }), artifact(1, { name: 'other-key' }),
    artifact(1, { workflow_run: undefined })]) {
    assert.equal(await fixture([[invalid]]).find(), null);
  }
  for (const state of [
    { ...successful, conclusion: 'failure' }, { ...successful, conclusion: 'cancelled' },
    { ...successful, status: 'in_progress' }, { ...successful, conclusion: null },
    { ...successful, head_repository: { full_name: 'fork/repo' } },
    { ...successful, path: '.github/workflows/unrelated.yml' },
  ]) assert.equal(await fixture([[artifact(1)]], { 1: state }).find(), null);
});

test('pagination and failed newer runs do not hide older valid evidence', async () => {
  const f = fixture([[artifact(1)], [artifact(2)]], { 1: { ...successful, conclusion: 'failure' } });
  assert.equal((await f.find()).id, 2);
  assert.deepEqual(f.reads, [1, 2]);
  assert.equal(await fixture([]).find(), null);
});

test('lookup failures cannot silently authorize reuse', async () => {
  const github = { rest: { actions: { listArtifactsForRepo: {} } },
    paginate: { iterator: async function* () { throw new Error('API unavailable'); } } };
  await assert.rejects(findArtifact({ github, context, suite: 'frontend', key: 'key' }), /API unavailable/);
});

test('validation artifacts retain diagnostics while only successful workflows can be reused', () => {
  for (const [suite, file] of Object.entries({ frontend: '02-frontend-ci.yml', backend: '03-backend-ci.yml',
    bruno: '04-bruno-tests.yml', versioning: '05-versioning-ci.yml' })) {
    const candidate = workflow(file);
    assert.equal(candidate.permissions.actions, 'read');
    const steps = Object.values(candidate.jobs)[0].steps;
    const lookup = steps.findIndex(step => step.id === 'validation');
    assert.ok(lookup > 0);
    assert.equal(steps[lookup].with.suite, suite);
    const upload = steps.find(step => step.uses === 'actions/upload-artifact@v7');
    assert.equal(upload.if, ['frontend', 'backend'].includes(suite)
      ? "always() && steps.tests.outcome != 'skipped' && steps.validation.outputs.reused != 'true'"
      : "steps.validation.outputs.reused != 'true'");
    assert.equal(upload.with.name, `${suite}-validation-` + '${{ steps.validation.outputs.key }}');
    assert.equal(upload.with['if-no-files-found'], 'error');
    assert.equal(upload.with['retention-days'], '${{ github.retention_days > 14 && 14 || github.retention_days }}');
    assert.ok(candidate.concurrency.group.includes('${{ github.run_id }}'));
    for (const step of steps.slice(lookup + 1).filter(step => step.run &&
        !step.name?.includes('logs') && !step.name?.includes('Stop'))) {
      assert.equal(step.if, "steps.validation.outputs.reused != 'true'", `${file}: ${step.name}`);
    }
  }
});

test('reports wait for release validation and download its exact artifact IDs', () => {
  const reports = workflow('09-reports-pages.yml');
  const steps = reports.jobs['build-reports'].steps;
  assert.equal(reports.permissions.actions, 'read');
  assert.equal(steps.filter(step => step.uses === 'actions/download-artifact@v8').length, 2);
  assert.ok(!steps.some(step => /gradlew|pnpm|npm install|vitest/.test(step.run ?? '')));
  assert.equal(reports.jobs['build-reports'].needs, 'validation');
  assert.equal(reports.jobs.validation.uses, './.github/workflows/12-release-validation.yml');
  for (const suite of ['frontend', 'backend']) {
    const download = steps.find(step => step.with?.path === `evidence/${suite}`);
    assert.equal(download.with['artifact-ids'], '${{ needs.validation.outputs.' + suite + '_artifact }}');
    assert.equal(download.with['run-id'], '${{ github.run_id }}');
  }
  assert.ok(steps.filter(step => step.uses === 'actions/download-artifact@v8')
    .every(step => step.with.path.startsWith('evidence/')));
  assert.ok(steps.some(step => step.run?.includes('assemble-public-coverage.mjs')));
});

test('private Allure publication is manual, uses attributed artifacts, and enforces private storage', () => {
  const candidate = workflow('11-publish-allure.yml');
  assert.deepEqual(Object.keys(candidate.on), ['workflow_dispatch']);
  const steps = candidate.jobs.publish.steps;
  assert.equal(steps.filter(step => step.uses === 'actions/download-artifact@v8').length, 2);
  assert.ok(!steps.some(step => /gradlew|vitest|pnpm|npm install/.test(step.run ?? '')));
  assert.ok(steps.some(step => step.run?.includes('value(public_access_prevention)')));
  const upload = steps.find(step => step.name === 'Upload private HTML then update catalog');
  assert.ok(upload.run.indexOf('private-reports/reports') < upload.run.indexOf('private-reports/catalog.json'));
  assert.ok(!upload.run.includes('publicRead'));
});

test('release validation pins one commit, forces both suites and gates every deployment', () => {
  const gate = workflow('12-release-validation.yml');
  assert.equal(gate.permissions.actions, 'read');
  assert.deepEqual(gate.jobs.evidence.needs, ['protected-files', 'resolve', 'frontend', 'backend']);
  for (const suite of ['frontend', 'backend']) {
    assert.equal(gate.jobs[suite].needs, 'resolve');
    assert.equal(gate.jobs[suite].with.ref, '${{ needs.resolve.outputs.sha }}');
    assert.equal(gate.jobs[suite].with.force, true);
  }
  for (const file of ['07-deploy-backend.yml', '08-deploy-frontend.yml', '09-reports-pages.yml', '11-publish-allure.yml']) {
    const candidate = workflow(file);
    const consumer = Object.values(candidate.jobs).find(job => job.needs === 'validation');
    assert.ok(consumer, file);
    assert.equal(candidate.jobs.validation.uses, './.github/workflows/12-release-validation.yml');
    const checkout = consumer.steps.find(step => step.uses === 'actions/checkout@v7');
    assert.equal(checkout.with.ref, '${{ needs.validation.outputs.sha }}');
    assert.ok(!JSON.stringify(consumer).includes('github.event.inputs.release_ref'));
  }
});

test('dev pushes validate changed inputs; main uses the shared coordinator', () => {
  for (const file of ['02-frontend-ci.yml', '03-backend-ci.yml']) {
    const candidate = workflow(file);
    assert.deepEqual(candidate.on.push.branches, ['dev']);
    assert.equal(candidate.on.push.paths, undefined);
    assert.equal(candidate.on.workflow_call.inputs.force.default, false);
    assert.ok(candidate.on.workflow_call.outputs.artifact);
  }
});

test('forced release validation ignores cached artifacts but still fingerprints the checkout', async () => {
  const action = yaml.parse(fs.readFileSync(path.join(__dirname,
    '../.github/actions/reuse-validation/action.yml'), 'utf8'));
  const script = action.runs.steps[0].with.script;
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const force of ['true', 'false']) {
    const outputs = {};
    let calls = 0;
    await new AsyncFunction('require', 'process', 'github', 'context', 'core', script)(
      () => ({ currentFingerprint: () => 'exact-key', findArtifact: async () => {
        calls += 1;
        return { workflow_run: { id: 42 } };
      } }),
      { env: { GITHUB_WORKSPACE: '/repo', VALIDATION_SUITE: 'frontend', FORCE_VALIDATION: force } },
      {}, context, { setOutput: (key, value) => { outputs[key] = value; }, info: () => {},
        warning: message => assert.fail(message) },
    );
    assert.equal(calls, force === 'true' ? 0 : 1);
    assert.deepEqual(outputs, { key: 'exact-key', reused: force === 'true' ? 'false' : 'true' });
  }
});

test('release evidence rejects stale SHAs, wrong fingerprints, invalid receipts and failed or partial tests', () => {
  const counts = { total: 3, passed: 3, failed: 0, skipped: 0, todo: 0 };
  const coverage = { status: 'available', sha: 'b'.repeat(40), runId: 'run', application: 'frontend',
    suite: 'combined', scope: 'complete', dirty: false, manifestSha256: 'c'.repeat(64) };
  const valid = {
    suite: 'frontend', key: 'a'.repeat(64), sha: 'b'.repeat(40), workflowRunId: '42',
    receipt: { schema: 1, valid: true, application: 'frontend', suite: 'combined',
      sha: 'b'.repeat(40), fingerprint: 'a'.repeat(64), workflowRunId: '42', runId: 'run',
      tests: counts, coverage },
    record: { application: 'frontend', suite: 'combined', scope: 'complete', dirty: false,
      sha: 'b'.repeat(40), runId: 'run', exitCode: 0, runnerExitCode: 0,
      counts: { matches: true, reportMatches: true, runner: counts }, coverage },
  };
  assert.doesNotThrow(() => validateEvidence(valid));
  for (const change of [
    { sha: 'c'.repeat(40) }, { key: 'c'.repeat(64) }, { workflowRunId: '43' },
    { receipt: { ...valid.receipt, valid: false } },
    { record: { ...valid.record, dirty: true } },
    { record: { ...valid.record, scope: 'partial' } },
    { record: { ...valid.record, exitCode: 1 } },
    { record: { ...valid.record, runnerExitCode: 1 } },
    { record: { ...valid.record, coverage: { status: 'unavailable' } } },
    { record: { ...valid.record, coverage: { ...coverage, sha: 'd'.repeat(40) } } },
    { receipt: { ...valid.receipt, coverage: { ...coverage, runId: 'older' } } },
    { receipt: { ...valid.receipt, coverage: { ...coverage, manifestSha256: 'd'.repeat(64) } } },
    { receipt: { ...valid.receipt, tests: { ...counts, skipped: 1 } } },
    { receipt: { ...valid.receipt, tests: { ...counts, failed: 1 } } },
    { receipt: { ...valid.receipt, tests: { ...counts, total: 0, passed: 0 } } },
    { record: { ...valid.record, counts: { ...valid.record.counts, matches: false } } },
  ]) assert.throws(() => validateEvidence({ ...valid, ...change }));
});
