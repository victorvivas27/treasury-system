const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { waitForMergedValidation, reconcileRelease } = require('./release-recovery.cjs');
const yaml = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'))('yaml');
const sha = 'a'.repeat(40);
const context = { repo: { owner: 'owner', repo: 'repo' } };
const merged = () => ({ number: 273, merged_at: '2026-10-28', merged: true, merge_commit_sha: sha,
  base: { ref: 'main' }, head: { ref: 'release-please--branches--main', sha: 'b'.repeat(40), repo: { full_name: 'owner/repo' } } });
const validation = (status = 'completed', conclusion = 'success', id = 1) => ({ id, status, conclusion,
  head_sha: 'b'.repeat(40), head_branch: 'release-please--branches--main',
  head_repository: { full_name: 'owner/repo' }, path: '.github/workflows/00-pr-validation.yml' });

function fixture({ prs = [merged()], states = [[validation()]], current = merged(), version = '1.39.0' } = {}) {
  let reads = 0;
  const sleeps = [], contents = [];
  const github = { paginate: async () => prs, rest: {
    repos: { listPullRequestsAssociatedWithCommit: {}, getContent: async args => {
      contents.push(args);
      return { data: { encoding: 'base64', content: Buffer.from(JSON.stringify({ '.': version })).toString('base64') } };
    } },
    actions: { listWorkflowRuns: async args => {
      assert.equal(args.head_sha, prs[0].head.sha);
      assert.equal(args.workflow_id, '00-pr-validation.yml');
      return { data: { workflow_runs: states[Math.min(reads++, states.length - 1)] } };
    } },
    pulls: { get: async () => ({ data: current }) },
  } };
  return { sleeps, contents, run: () => waitForMergedValidation({ github, context, sha, attempts: 3, sleep: async ms => sleeps.push(ms) }) };
}

test('a manually merged release waits for its PR validation before publication', async () => {
  const f = fixture({ states: [[], [validation('in_progress', null)], [validation()]] });
  assert.deepEqual(await f.run(), { sha, tag: 'v1.39.0' });
  assert.deepEqual(f.sleeps, [10000, 10000]);
  assert.equal(f.contents[0].ref, sha);
});

test('direct pushes do not invent a release and ordinary merged PRs still wait', async () => {
  assert.deepEqual(await fixture({ prs: [] }).run(), { sha, tag: '' });
  const pr = merged(); pr.head.ref = 'dev';
  const run = validation(); run.head_branch = 'dev';
  const f = fixture({ prs: [pr], current: pr, states: [[run]] });
  assert.deepEqual(await f.run(), { sha, tag: '' });
  assert.equal(f.contents.length, 0);
});

test('failed, cancelled, absent and unfinished PR validations block publication', async () => {
  for (const state of ['failure', 'cancelled', 'skipped', 'timed_out']) {
    await assert.rejects(fixture({ states: [[validation('completed', state)]] }).run(), /publication blocked/);
  }
  for (const states of [[[]], [[validation('in_progress', null)]]]) {
    await assert.rejects(fixture({ states }).run(), /absent or pending/);
  }
});

test('foreign and stale runs cannot authorize publication and the newest run wins', async () => {
  for (const invalid of [
    { ...validation(), head_repository: { full_name: 'foreign/repo' } },
    { ...validation(), head_sha: 'c'.repeat(40) },
    { ...validation(), head_branch: 'another-branch' },
    { ...validation(), path: '.github/workflows/another.yml' },
  ]) await assert.rejects(fixture({ states: [[invalid]] }).run(), /publication blocked/);
  await assert.rejects(fixture({ states: [[validation(), validation('completed', 'failure', 2)]] }).run(), /failure/);
});

test('changed PR identity and invalid manifest cannot be published', async () => {
  for (const change of [{ merged: false }, { merge_commit_sha: 'd'.repeat(40) }, { head: { ...merged().head, sha: 'd'.repeat(40) } }]) {
    await assert.rejects(fixture({ current: { ...merged(), ...change } }).run(), /changed/);
  }
  for (const version of [null, 'invalid', '1.39.0\ntag=evil']) {
    await assert.rejects(fixture({ version }).run(), /Invalid stable release/);
  }
});

function reconcile(overrides = {}, invalid = {}) {
  return reconcileRelease({ github: { rest: { repos: {
    getReleaseByTag: async () => ({ data: { tag_name: 'v1.39.0', draft: false, prerelease: false, published_at: '2026-10-28', ...invalid.release } }),
    getCommit: async () => ({ data: { sha: invalid.sha ?? sha } }),
  } } }, context, sha, expectedTag: 'v1.39.0', released: false, tag: '', outcomes: ['failure', 'success', 'skipped'], ...overrides });
}

test('retries and reruns recover an already published exact release without relying on lost outputs', async () => {
  for (const outcomes of [['failure', 'success'], ['success'], ['failure', 'failure', 'failure']]) {
    assert.deepEqual(await reconcile({ outcomes }), { releases_created: 'true', tag_name: 'v1.39.0' });
  }
  assert.deepEqual(await reconcile({ expectedTag: '', released: true, tag: 'v1.39.0' }), { releases_created: 'true', tag_name: 'v1.39.0' });
});

test('all failed attempts remain failures unless exact publication is verified', async () => {
  await assert.rejects(reconcile({ expectedTag: '', outcomes: ['failure', 'failure', 'failure'] }), /three bounded attempts/);
  const github = { rest: { repos: { getReleaseByTag: async () => { throw Object.assign(new Error('not published'), { status: 404 }); } } } };
  await assert.rejects(reconcile({ github }), /not published/);
  assert.deepEqual(await reconcile({ expectedTag: '' }), { releases_created: 'false', tag_name: '' });
});

test('wrong commits, unexpected tags and unpublished releases fail closed', async () => {
  for (const invalid of [{ sha: 'd'.repeat(40) }, { release: { draft: true } }, { release: { prerelease: true } },
    { release: { published_at: null } }, { release: { tag_name: 'v1.38.0' } }]) {
    await assert.rejects(reconcile({}, invalid), /does not match/);
  }
  await assert.rejects(reconcile({ released: true, tag: 'v1.38.0' }), /unexpected tag/);
  await assert.rejects(reconcile({ released: true, expectedTag: '', tag: '' }), /did not identify/);
  assert.deepEqual(await reconcile({ released: true, tag: '' }), { releases_created: 'true', tag_name: 'v1.39.0' });
});

test('both release stages use bounded retries with mandatory reconciliation and source validation', () => {
  const root = path.join(__dirname, '..');
  const action = yaml.parse(fs.readFileSync(path.join(root, '.github/actions/release-please/action.yml'), 'utf8'));
  const steps = action.runs.steps;
  assert.equal(steps[0].id, 'expected');
  assert.match(steps[0].with.script, /waitForMergedValidation/);
  const attempts = steps.filter(step => step.uses === 'googleapis/release-please-action@v5');
  assert.equal(attempts.length, 3);
  for (const [index, attempt] of attempts.entries()) {
    assert.equal(attempt['continue-on-error'], true);
    if (index > 0) assert.equal(attempt.if, `steps.attempt${index}.outcome == 'failure'`);
  }
  assert.equal(steps.at(-1).id, 'result');
  assert.match(steps.at(-1).with.script, /reconcileRelease/);
  const workflow = yaml.parse(fs.readFileSync(path.join(root, '.github/workflows/06-release-please.yml'), 'utf8'));
  for (const [job, id] of [['prepare', 'release'], ['publish', 'publish']]) {
    const release = workflow.jobs[job].steps.find(step => step.id === id);
    assert.equal(release.uses, './.github/actions/release-please');
    assert.equal(workflow.jobs[job].permissions.actions, 'read');
    assert.ok(workflow.jobs[job].steps.slice(0, workflow.jobs[job].steps.indexOf(release)).some(step => step.uses === 'actions/checkout@v7'));
  }
  assert.equal(workflow.jobs.publish.steps.find(step => step.id === 'publish').with.sha, '${{ steps.merge.outputs.sha }}');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'release-please-config.json'), 'utf8')).packages['.'];
  assert.equal(config['include-v-in-tag'], true);
  assert.equal(config['include-component-in-tag'], false);
});
