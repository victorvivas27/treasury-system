const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const tool = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'));
const yaml = tool('yaml');
const workflow = yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows/release-please.yml'), 'utf8'));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const context = { repo: { owner: 'owner', repo: 'repo' } };
const run = (script, github, env = {}, core = {}) => new AsyncFunction('github', 'context', 'process', 'core', script)(github, context, { env }, core);
const mergeScript = workflow.jobs.publish.steps[0].with.script;
const env = { RELEASE_BASE: 'base-sha', RELEASE_SHA: 'tested-sha', RELEASE_PR: '42' };
const pr = () => ({ number: 42, state: 'open', draft: false, title: ' chore(main): release 1.0.0 ',
  base: { ref: 'main', sha: 'base-sha' }, head: { ref: 'release-please--branches--main', sha: 'tested-sha', repo: { full_name: 'owner/repo' } },
  labels: [{ name: 'autorelease: pending' }] });
function fixture({ main = 'base-sha', candidate = pr(), merged = true } = {}) {
  const calls = [];
  return { calls, github: { rest: {
    git: { getRef: async () => ({ data: { object: { sha: main } } }) },
    pulls: {
      get: async () => ({ data: candidate }),
      merge: async args => { calls.push(args); return { data: { merged, message: 'Merge blocked' } }; },
    },
  } } };
}
test('merge waits for all three CI workflows', () => {
  assert.deepEqual(workflow.jobs.publish.needs, ['prepare', 'frontend', 'backend', 'versioning']);
  assert.equal(workflow.jobs.publish.if, undefined); // Default success() gate; no always() bypass.
  for (const job of ['frontend', 'backend', 'versioning']) {
    assert.equal(workflow.jobs[job].with.ref, '${{ needs.prepare.outputs.sha }}');
  }
});
test('successful merge is bound to the tested SHA and uses a trimmed conventional title', async () => {
  const { github, calls } = fixture();
  await run(mergeScript, github, env);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sha, 'tested-sha');
  assert.equal(calls[0].commit_title, 'chore(main): release 1.0.0');
  assert.equal(calls[0].merge_method, 'squash');
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
  await run(workflow.jobs.prepare.steps[1].with.script, github, {}, { setOutput: (key, value) => { outputs[key] = value; } });
  assert.deepEqual(outputs, { number: 42, sha: 'tested-sha', base: 'base-sha' });
});
test('a release branch behind main cannot start validation', async () => {
  const github = { rest: {
    pulls: { list: async () => ({ data: [pr()] }) },
    repos: { compareCommits: async () => ({ data: { merge_base_commit: { sha: 'old-base' } } }) },
  } };
  await assert.rejects(run(workflow.jobs.prepare.steps[1].with.script, github), /behind main/);
});
test('deployment dispatch preserves all existing release-dependent workflows', async () => {
  const calls = [];
  const github = { rest: { actions: { createWorkflowDispatch: async args => { calls.push(args); } } } };
  await run(workflow.jobs.deploy.steps[0].with.script, github);
  assert.deepEqual(calls.map(call => call.workflow_id), ['deploy-frontend.yml', 'deploy-backend.yml', 'reports-pages.yml']);
  assert.ok(calls.every(call => call.ref === 'main'));
});
