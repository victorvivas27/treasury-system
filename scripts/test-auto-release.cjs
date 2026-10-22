const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const tool = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'));
const yaml = tool('yaml');
const workflow = yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows/06-release-please.yml'), 'utf8'));
const productionWorkflows = ['07-deploy-backend.yml', '08-deploy-frontend.yml', '09-reports-pages.yml']
  .map(file => [file, yaml.parse(fs.readFileSync(path.join(__dirname, `../.github/workflows/${file}`), 'utf8'))]);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const context = { repo: { owner: 'owner', repo: 'repo' } };
const run = (script, github, env = {}, core = {}, timer = (resolve) => setTimeout(resolve, 0)) =>
  new AsyncFunction('github', 'context', 'process', 'core', 'setTimeout', script)(
    github,
    context,
    { env },
    { info: () => {}, ...core },
    timer,
  );
const mergeScript = workflow.jobs.publish.steps[0].with.script;
const env = { RELEASE_BASE: 'base-sha', RELEASE_SHA: 'tested-sha', RELEASE_PR: '42' };
const pr = () => ({ number: 42, state: 'open', draft: false, title: ' chore(main): release 1.0.0 ',
  merge_commit_sha: 'merge-sha',
  base: { ref: 'main', sha: 'base-sha' }, head: { ref: 'release-please--branches--main', sha: 'tested-sha', repo: { full_name: 'owner/repo' } },
  labels: [{ name: 'autorelease: pending' }] });
function fixture({ main = 'base-sha', candidate = pr(), merged = true, checkStates = ['success'] } = {}) {
  const calls = [], checkQueries = [];
  let prReads = 0, checkReads = 0;
  return { calls, github: { rest: {
    git: { getRef: async () => ({ data: { object: { sha: main } } }) },
    pulls: {
      get: async () => ({ data: typeof candidate === 'function' ? candidate(++prReads) : candidate }),
      merge: async args => { calls.push(args); return { data: { merged, message: 'Merge blocked' } }; },
    },
    checks: {
      listForRef: async args => {
        checkQueries.push(args);
        const state = checkStates[Math.min(checkReads++, checkStates.length - 1)];
        if (state === 'absent') return { data: { check_runs: [] } };
        return { data: { check_runs: [{
          id: 100 + checkReads,
          name: 'PR validation result',
          status: state === 'success' || state === 'failure' ? 'completed' : state,
          conclusion: state === 'success' ? 'success' : state === 'failure' ? 'failure' : null,
          pull_requests: [{ number: 42, head: { sha: 'tested-sha' }, base: { sha: 'base-sha' } }],
        }] } };
      },
    },
  } }, checkQueries };
}
test('release reuses the required PR validation instead of running duplicate suites', () => {
  assert.equal(workflow.jobs.publish.needs, 'prepare');
  assert.equal(workflow.jobs.publish.if.trim(), "needs.prepare.outputs.number != ''");
  for (const job of ['frontend', 'backend', 'versioning', 'bruno']) {
    assert.equal(workflow.jobs[job], undefined);
  }
  const token = workflow.jobs.prepare.steps.find(step => step.id === 'release-please-token');
  assert.equal(token.uses, 'actions/create-github-app-token@v3');
  assert.equal(token.with['permission-contents'], 'write');
  assert.equal(token.with['permission-pull-requests'], 'write');
  assert.equal(token.with['permission-issues'], 'write');
  assert.equal(token.with.owner, '${{ github.repository_owner }}');
  assert.equal(token.with.repositories, '${{ github.event.repository.name }}');
  assert.equal(token.with['client-id'], '${{ vars.RELEASE_PLEASE_APP_CLIENT_ID }}');
  assert.equal(token.with['private-key'], '${{ secrets.RELEASE_PLEASE_APP_PRIVATE_KEY }}');
  assert.equal(workflow.jobs.prepare.permissions.contents, 'read');
  assert.equal(workflow.jobs.prepare.permissions['pull-requests'], 'read');
  assert.equal(workflow.jobs.prepare.steps.find(step => step.id === 'release').with.token,
    '${{ steps.release-please-token.outputs.token }}');
  assert.equal(workflow.jobs.publish.permissions.checks, 'read');
  assert.equal(workflow.jobs.publish.permissions.issues, undefined);
});
test('successful required check is revalidated and merge is bound to the tested SHA', async () => {
  const { github, calls, checkQueries } = fixture();
  await run(mergeScript, github, env);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sha, 'tested-sha');
  assert.equal(calls[0].commit_title, 'chore(main): release 1.0.0');
  assert.equal(calls[0].merge_method, 'merge');
  assert.ok(checkQueries.length >= 2);
  assert.ok(checkQueries.every(query => query.ref === 'merge-sha' && query.check_name === 'PR validation result'));
});
test('pending required check is polled until it succeeds', async () => {
  const { github, calls, checkQueries } = fixture({ checkStates: ['in_progress', 'success', 'success'] });
  await run(mergeScript, github, env);
  assert.equal(checkQueries.length, 3);
  assert.equal(calls.length, 1);
});
test('failed required check prevents merge immediately', async () => {
  const { github, calls } = fixture({ checkStates: ['failure'] });
  await assert.rejects(run(mergeScript, github, env), /PR validation result completed with conclusion: failure/);
  assert.equal(calls.length, 0);
});
test('missing required check times out without merging', async () => {
  const { github, calls, checkQueries } = fixture({ checkStates: ['absent'] });
  await assert.rejects(run(mergeScript, github, env), /PR validation result was absent or still pending/);
  assert.equal(checkQueries.length, 180);
  assert.equal(calls.length, 0);
});
test('changed PR SHA after successful validation prevents merge', async () => {
  const candidate = readNumber => {
    const current = pr();
    if (readNumber > 1) current.head.sha = 'newer-sha';
    return current;
  };
  const { github, calls } = fixture({ candidate });
  await assert.rejects(run(mergeScript, github, env), /head changed during validation/);
  assert.equal(calls.length, 0);
});
test('changed PR base after successful validation prevents merge', async () => {
  const candidate = readNumber => {
    const current = pr();
    if (readNumber > 1) current.base.sha = 'newer-main';
    return current;
  };
  const { github, calls } = fixture({ candidate });
  await assert.rejects(run(mergeScript, github, env), /main changed during validation/);
  assert.equal(calls.length, 0);
});
test('main changing during CI prevents merge', async () => {
  const { github, calls } = fixture({ main: 'new-main' });
  await assert.rejects(run(mergeScript, github, env), /main changed/);
  assert.equal(calls.length, 0);
});
test('closed, draft, unlabelled, foreign and unrelated PRs cannot be merged', async () => {
  for (const mutate of [
    p => { p.state = 'closed'; }, p => { p.draft = true; }, p => { p.labels = []; },
    p => { p.head.repo.full_name = 'fork/repo'; }, p => { p.head.ref = 'feature'; },
    p => { p.base.ref = 'dev'; },
  ]) {
    const candidate = pr(); mutate(candidate);
    const { github, calls } = fixture({ candidate });
    await assert.rejects(run(mergeScript, github, env), /Not an eligible/);
    assert.equal(calls.length, 0);
  }
});
test('GitHub branch protection rejection stops publication', async () => {
  const { github } = fixture({ merged: false });
  await assert.rejects(run(mergeScript, github, env), /Merge blocked/);
});
test('a pending unchanged PR is selected again on retry', async () => {
  const outputs = {};
  const github = { rest: {
    pulls: { list: async () => ({ data: [pr()] }) },
    repos: { compareCommits: async () => ({ data: { merge_base_commit: { sha: 'base-sha' } } }) },
  } };
  await run(workflow.jobs.prepare.steps.find(step => step.id === 'candidate').with.script,
    github, {}, { setOutput: (key, value) => { outputs[key] = value; } });
  assert.deepEqual(outputs, { number: 42, sha: 'tested-sha', base: 'base-sha' });
});
test('a release branch behind main cannot start validation', async () => {
  const github = { rest: {
    pulls: { list: async () => ({ data: [pr()] }) },
    repos: { compareCommits: async () => ({ data: { merge_base_commit: { sha: 'old-base' } } }) },
  } };
  await assert.rejects(run(workflow.jobs.prepare.steps.find(step => step.id === 'candidate').with.script, github), /behind main/);
});
test('deployment dispatch preserves all existing release-dependent workflows', async () => {
  const calls = [];
  const github = { rest: { actions: { createWorkflowDispatch: async args => { calls.push(args); } } } };
  await run(workflow.jobs.deploy.steps[0].with.script, github, { RELEASE_REF: 'v1.0.0' });
  assert.deepEqual(calls.map(call => call.workflow_id), ['07-deploy-backend.yml', '08-deploy-frontend.yml', '09-reports-pages.yml']);
  assert.ok(calls.every(call => call.ref === 'main'));
  assert.ok(calls.every(call => call.inputs.release_ref === 'v1.0.0'));
});

test('production workflows are manual-only and serialize by service', () => {
  for (const [file, candidate] of productionWorkflows) {
    assert.ok(candidate.on.workflow_dispatch, file);
    assert.equal(candidate.on.release, undefined, file);
    assert.equal(candidate.concurrency['cancel-in-progress'], false, file);
  }
});
