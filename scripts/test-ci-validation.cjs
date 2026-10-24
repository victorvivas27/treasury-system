const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { fingerprint, currentFingerprint, findArtifact } = require('./ci-validation.cjs');
const yaml = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'))('yaml');
const workflow = file => yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows', file), 'utf8'));
const listing = files => Object.entries(files).map(([file, blob]) => `100644 blob ${blob}\t${file}`).join('\0');
const inputs = { 'frontend/src/App.tsx': 'front', 'backend/src/App.java': 'back',
  'api-tests/test.yml': 'api', '.github/workflows/00-pr-validation.yml': 'workflow',
  'scripts/ci-validation.cjs': 'helper', 'VERSION': 'version', 'frontend/package.json': 'package',
  'backend/build.gradle': 'gradle', 'frontend/.commitlintrc.cjs': 'commit-config',
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

test('reports download matching existing coverage without compiling or rerunning tests', () => {
  const reports = workflow('09-reports-pages.yml');
  const steps = reports.jobs['build-reports'].steps;
  assert.equal(reports.permissions.actions, 'read');
  assert.equal(steps.filter(step => step.uses === 'actions/download-artifact@v8').length, 2);
  assert.ok(!steps.some(step => /gradlew|pnpm|npm install|vitest/.test(step.run ?? '')));
  assert.ok(steps.find(step => step.id === 'reports').with.script.includes('currentFingerprint(suite)'));
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

test('report resolution waits for workflow finalization and preserves artifact provenance', async () => {
  const script = workflow('09-reports-pages.yml').jobs['build-reports'].steps.find(step => step.id === 'reports').with.script;
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const outputs = {}, requests = [];
  let lookups = 0;
  await new AsyncFunction('require', 'process', 'github', 'context', 'core', 'setTimeout', script)(
    () => ({ currentFingerprint: suite => `${suite}-key`, findArtifact: async args => {
      requests.push(args);
      if (++lookups === 1) return null; // Workflow still finalizing after its result job.
      return { id: args.suite === 'frontend' ? 11 : 22, workflow_run: { id: 42 } };
    } }),
    { env: { GITHUB_WORKSPACE: '/repo' } }, {}, context,
    { setOutput: (name, value) => { outputs[name] = value; } }, resolve => resolve(),
  );
  assert.equal(requests.length, 3);
  assert.deepEqual(outputs, { frontend_artifact: 11, frontend_run: 42, backend_artifact: 22, backend_run: 42 });
  assert.ok(requests.every(args => args.key === `${args.suite}-key`));
});

test('reports fail explicitly when proof is missing rather than publishing unrelated coverage', async () => {
  const script = workflow('09-reports-pages.yml').jobs['build-reports'].steps.find(step => step.id === 'reports').with.script;
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let lookups = 0;
  await assert.rejects(new AsyncFunction('require', 'process', 'github', 'context', 'core', 'setTimeout', script)(
    () => ({ currentFingerprint: () => 'missing', findArtifact: async () => { lookups += 1; return null; } }),
    { env: { GITHUB_WORKSPACE: '/repo' } }, {}, context, {}, resolve => resolve(),
  ), /No successful frontend coverage matches this release/);
  assert.equal(lookups, 6);
});
