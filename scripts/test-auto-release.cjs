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
    { info: () => {}, setOutput: () => {}, ...core },
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
      merge: async args => { calls.push(args); return { data: { merged, sha: 'published-sha', message: 'Merge blocked' } }; },
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
  const outputs = {};
  await run(mergeScript, github, env, { setOutput: (key, value) => { outputs[key] = value; } });
  assert.deepEqual(outputs, { sha: 'published-sha', merged: 'true' });
  assert.equal(workflow.jobs.publish.steps.find(step => step.id === 'publish').if, "steps.merge.outputs.merged == 'true'");
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
  await run(mergeScript, github, env);
  assert.equal(calls.length, 0);
});
test('changed PR base after successful validation prevents merge', async () => {
  const candidate = readNumber => {
    const current = pr();
    if (readNumber > 1) current.base.sha = 'newer-main';
    return current;
  };
  const { github, calls } = fixture({ candidate });
  await run(mergeScript, github, env);
  assert.equal(calls.length, 0);
});
test('main changing during CI prevents merge', async () => {
  const { github, calls } = fixture({ main: 'new-main' });
  const outputs = {};
  await run(mergeScript, github, env, { setOutput: (key, value) => { outputs[key] = value; } });
  assert.deepEqual(outputs, {});
  assert.equal(calls.length, 0);
});

test('a base change in the final merge window skips publication', async () => {
  const candidate = read => ({ ...pr(), base: { ref: 'main', sha: read >= 3 ? 'new-main' : 'base-sha' } });
  const { github, calls } = fixture({ candidate });
  const outputs = {};
  await run(mergeScript, github, env, { setOutput: (key, value) => { outputs[key] = value; } });
  assert.equal(calls.length, 0);
  assert.deepEqual(outputs, {});
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
  const outputs = {};
  await run(workflow.jobs.prepare.steps.find(step => step.id === 'candidate').with.script, github, {},
    { setOutput: (key, value) => { outputs[key] = value; } });
  assert.deepEqual(outputs, {});
});
test('production consumers share one final validation in the same run', () => {
  assert.equal(workflow.jobs['validate-release'].uses, './.github/workflows/12-release-validation.yml');
  assert.equal(workflow.jobs.deploy, undefined);
  for (const [id, file] of [['deploy-backend', '07-deploy-backend.yml'], ['deploy-frontend', '08-deploy-frontend.yml'], ['publish-reports', '09-reports-pages.yml']]) {
    const job = workflow.jobs[id];
    assert.deepEqual(job.needs, ['release-result', 'validate-release']);
    assert.equal(job.uses, './.github/workflows/' + file);
    assert.equal(job.secrets, 'inherit');
    assert.equal(job.with.validated_sha, '${{ needs.validate-release.outputs.sha }}');
    for (const field of ['frontend_artifact', 'backend_artifact', 'frontend_key', 'backend_key']) {
      assert.equal(job.with[field], '${{ needs.validate-release.outputs.' + field + ' }}');
    }
    const eligible = new Function('needs', 'always', 'cancelled', 'return ' + job.if);
    for (const result of ['success', 'failure', 'skipped', 'cancelled']) {
      assert.equal(eligible({ 'release-result': { result: 'success' }, 'validate-release': { result } }, () => true, () => false), result === 'success');
    }
  }
});

test('both publication routes activate the shared release result, but failures and absent releases do not', async () => {
  const result = workflow.jobs['release-result'];
  assert.deepEqual(result.needs, ['prepare', 'publish']);
  assert.equal(workflow.jobs.prepare.outputs.tag_name, '${{ steps.release.outputs.tag_name }}');
  assert.deepEqual(workflow.jobs['validate-release'].needs, ['release-result', 'main-checks']);
  for (const job of ['validate-release']) {
    const canContinue = new Function('needs', 'always', 'cancelled', `return ${workflow.jobs[job].if};`);
    const needs = result => ({ 'release-result': { result }, 'main-checks': { result: 'success' } });
    assert.equal(canContinue(needs('success'), () => true, () => false), true);
    assert.equal(canContinue(needs('skipped'), () => true, () => false), false);
    assert.equal(canContinue(needs('failure'), () => true, () => false), false);
    assert.equal(canContinue(needs('success'), () => true, () => true), false);
    assert.equal(canContinue({ ...needs('success'), 'main-checks': { result: 'failure' } }, () => true, () => false), false);
  }
  assert.equal(workflow.jobs['validate-release'].with.ref, '${{ needs.main-checks.outputs.sha }}');
  const eligible = new Function('needs', 'always', 'cancelled', `return ${result.if};`);
  const cases = [
    ['success', 'true', 'skipped', '', true],
    ['success', '', 'success', 'true', true],
    ['success', '', 'skipped', '', false],
    ['success', '', 'success', 'false', false],
    ['failure', 'true', 'skipped', '', false],
    ['success', 'true', 'failure', '', false],
    ['success', 'true', 'cancelled', '', false],
  ];
  for (const [prepareResult, prepared, publishResult, published, expected] of cases) {
    const needs = {
      prepare: { result: prepareResult, outputs: { released: prepared } },
      publish: { result: publishResult, outputs: { released: published } },
    };
    assert.equal(eligible(needs, () => true, () => false), expected);
    assert.equal(eligible(needs, () => true, () => true), false);
  }
  const script = result.steps[0].with.script;
  for (const env of [
    { PREPARE_RELEASED: 'true', PREPARE_TAG: 'v1.30.0', PUBLISH_RELEASED: '' },
    { PREPARE_RELEASED: '', PUBLISH_RELEASED: 'true', PUBLISH_TAG: 'v1.30.0' },
  ]) {
    const outputs = {};
    await run(script, {}, env, { setOutput: (key, value) => { outputs[key] = value; } });
    assert.deepEqual(outputs, { tag_name: 'v1.30.0' });
  }
  await assert.rejects(run(script, {}, { PREPARE_RELEASED: 'true' }), /without an exact tag/);
  await assert.rejects(run(script, {}, { PUBLISH_RELEASED: 'true' }), /without an exact tag/);
});

test('production workflows support manual and reusable calls and serialize by service', () => {
  for (const [file, candidate] of productionWorkflows) {
    assert.ok(candidate.on.workflow_dispatch, file);
    assert.ok(candidate.on.workflow_call, file);
    for (const field of ['validated_sha', 'frontend_artifact', 'backend_artifact', 'frontend_key', 'backend_key']) {
      assert.equal(candidate.jobs.validation.with[field], '${{ inputs.' + field + " || '' }}");
    }
    assert.equal(candidate.on.release, undefined, file);
    assert.equal(candidate.concurrency['cancel-in-progress'], false, file);
  }
});


test('one main coordinator replaces independent push workflows and tag checks', () => {
  const root = path.join(__dirname, '../.github/workflows');
  const definitions = fs.readdirSync(root).map(file => [file, yaml.parse(fs.readFileSync(path.join(root, file), 'utf8'))]);
  const matchesPush = branch => definitions.filter(([, candidate]) => {
    if (!Object.hasOwn(candidate.on, 'push')) return false;
    const trigger = candidate.on.push;
    return !trigger?.branches || trigger.branches.includes(branch);
  }).map(([file]) => file);
  assert.deepEqual(matchesPush('main'), ['06-release-please.yml']);
  assert.deepEqual(matchesPush('release-please--branches--main'), []);
  for (const [, candidate] of definitions) {
    if (Object.hasOwn(candidate.on, 'push')) assert.ok(candidate.on.push.branches?.length);
  }
  const checks = workflow.jobs['main-checks'];
  assert.equal(checks.uses, './.github/workflows/14-main-validation.yml');
  assert.equal(checks.with.ref, '${{ needs.release-result.outputs.tag_name || github.sha }}');
  const main = definitions.find(([file]) => file === '14-main-validation.yml')[1];
  assert.deepEqual(Object.keys(main.on), ['workflow_call']);
  for (const suite of ['frontend', 'backend']) {
    const eligible = new Function('inputs', 'return ' + main.jobs[suite].if);
    assert.equal(eligible({ release: true }), false);
    assert.equal(eligible({ release: false }), true);
    assert.equal(main.jobs[suite].with.force, undefined);
    assert.equal(main.jobs[suite].with.ref, '${{ needs.commits.outputs.sha }}');
  }
  for (const suite of ['versioning', 'bruno', 'protected-files']) assert.ok(main.jobs[suite]);
  assert.equal(main.jobs['protected-files'].with.ref, '${{ needs.commits.outputs.sha }}');
});

test('main checks cover ordinary pushes and releases but reject failed and superseded runs', () => {
  const eligible = new Function('needs', 'always', 'cancelled', 'return ' + workflow.jobs['main-checks'].if);
  for (const [release, current, expected] of [['success', 'false', true], ['skipped', 'true', true], ['skipped', 'false', false], ['failure', 'true', false]]) {
    const needs = { prepare: { result: 'success' }, publish: { result: 'skipped' }, 'main-target': { result: 'success', outputs: { current } }, 'release-result': { result: release } };
    assert.equal(eligible(needs, () => true, () => false), expected);
    assert.equal(eligible(needs, () => true, () => true), false);
    needs.publish.result = 'failure';
    assert.equal(eligible(needs, () => true, () => false), false);
  }
});

test('synchronization waits for all applicable main checks, including final release evidence', () => {
  const eligible = new Function('needs', 'always', 'cancelled', 'return ' + workflow.jobs['sync-dev'].if);
  for (const [main, release, evidence, expected] of [
    ['success', 'success', 'success', true], ['success', 'skipped', 'skipped', true],
    ['failure', 'success', 'success', false], ['success', 'success', 'failure', false],
    ['success', 'success', 'skipped', false], ['success', 'failure', 'skipped', false],
    ['cancelled', 'skipped', 'skipped', false],
  ]) {
    const needs = { 'main-checks': { result: main }, 'release-result': { result: release }, 'validate-release': { result: evidence } };
    assert.equal(eligible(needs, () => true, () => false), expected);
    assert.equal(eligible(needs, () => true, () => true), false);
  }
});

test('superseded main commits defer to the newer queued run', async () => {
  for (const sha of ['selected-sha', 'newer-sha']) {
    const outputs = {};
    await run(workflow.jobs['main-target'].steps[0].with.script,
      { rest: { git: { getRef: async () => ({ data: { object: { sha } } }) } } },
      { EXPECTED_SHA: 'selected-sha' }, { setOutput: (key, value) => { outputs[key] = value; } });
    assert.deepEqual(outputs, { current: String(sha === 'selected-sha') });
  }
});


test('coordinator dependencies are acyclic and reusable calls declare their inputs', () => {
  const root = path.join(__dirname, '../.github/workflows');
  for (const file of fs.readdirSync(root)) {
    const candidate = yaml.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    const active = new Set();
    const visited = new Set();
    const visit = id => {
      assert.ok(candidate.jobs[id], file + ': unknown dependency ' + id);
      assert.ok(!active.has(id), file + ': circular dependency ' + id);
      if (visited.has(id)) return;
      active.add(id);
      const job = candidate.jobs[id];
      for (const dependency of [].concat(job.needs ?? [])) visit(dependency);
      active.delete(id);
      visited.add(id);
      if (job.uses?.startsWith('./.github/workflows/')) {
        const child = yaml.parse(fs.readFileSync(path.join(root, path.basename(job.uses)), 'utf8'));
        assert.ok(Object.hasOwn(child.on, 'workflow_call'), job.uses);
        const declared = child.on.workflow_call?.inputs ?? {};
        for (const input of Object.keys(job.with ?? {})) assert.ok(Object.hasOwn(declared, input), job.uses + ': undeclared input ' + input);
        for (const [input, definition] of Object.entries(declared)) {
          if (definition.required) assert.ok(Object.hasOwn(job.with ?? {}, input), job.uses + ': missing input ' + input);
        }
      }
    };
    for (const id of Object.keys(candidate.jobs)) visit(id);
  }
});
