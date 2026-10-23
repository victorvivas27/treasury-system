const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const yaml = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'))('yaml');
const read = file => yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows', file), 'utf8'));
const workflow = read('10-sync-main-dev.yml');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function fixture({ relation = 'diverged', conflict = false, verified = true, race = false, prevalidated = false } = {}) {
  const merges = [], updates = [], outputs = {};
  let mainUpdated = false;
  const github = { rest: {
    git: {
      getRef: async ({ ref }) => ({ data: { object: { sha: ref === 'heads/main' ? 'main-sha' : mainUpdated ? (relation === 'diverged' ? 'merge-sha' : 'main-sha') : 'dev-sha' } } }),
      updateRef: async args => {
        updates.push(args);
        if (race) throw Object.assign(new Error('Not a fast-forward'), { status: 422 });
        mainUpdated = true;
      },
    },
    repos: {
      compareCommits: async ({ base, head }) => {
        if (base === 'main-sha' && (head === 'dev' || mainUpdated)) return { data: { merge_base_commit: { sha: mainUpdated ? (verified ? 'main-sha' : 'old-base') : relation === 'dev-ahead' ? 'main-sha' : 'old-base' } } };
        if (head === 'main-sha') return { data: { merge_base_commit: { sha: relation === 'dev-behind' ? 'dev-sha' : 'old-base' } } };
        return { data: { merge_base_commit: { sha: verified ? 'main-sha' : 'old-base' } } };
      },
      merge: async args => {
        if (conflict) throw Object.assign(new Error('Merge conflict'), { status: 409 });
        merges.push(args);
        mainUpdated = true;
      },
    },
  } };
  return { merges, updates, outputs, run: () => new AsyncFunction('github', 'context', 'core', 'process', workflow.jobs.sync.steps[0].with.script)(
    github, { repo: { owner: 'owner', repo: 'repo' } },
    { info: () => {}, setOutput: (key, value) => { outputs[key] = value; } },
    { env: { ALREADY_VALIDATED: String(prevalidated) } },
  ) };
}

test('sync runs for main pushes, manual retries and bot releases', () => {
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'));
  assert.ok(Object.hasOwn(workflow.on, 'workflow_call'));
  assert.equal(read('06-release-please.yml').jobs['sync-dev'].uses, './.github/workflows/10-sync-main-dev.yml');
  assert.equal(read('06-release-please.yml').jobs['sync-dev'].needs, 'release-result');
  assert.equal(read('06-release-please.yml').jobs['sync-dev'].with.already_validated, true);
  assert.equal(workflow.on.workflow_call.inputs.already_validated.default, false);
  assert.equal(workflow.jobs.sync.concurrency['cancel-in-progress'], false);
});

test('branches already in sync do not create a commit or rerun validations', async () => {
  const f = fixture({ relation: 'dev-ahead' });
  await f.run();
  assert.equal(f.merges.length, 0);
  assert.equal(f.updates.length, 0);
  assert.deepEqual(f.outputs, { sha: 'dev-sha', requiresValidation: 'false' });
});

test('main push fast-forwards dev and retains validation when checks are not proven', async () => {
  const f = fixture({ relation: 'dev-behind' });
  await f.run();
  assert.equal(f.merges.length, 0);
  assert.equal(f.updates.length, 1);
  assert.equal(f.updates[0].ref, 'heads/dev');
  assert.equal(f.updates[0].sha, 'main-sha');
  assert.equal(f.updates[0].force, false);
  assert.deepEqual(f.outputs, { sha: 'main-sha', requiresValidation: 'true' });
});

test('release call fast-forwards dev without repeating checks already run on its candidate', async () => {
  const f = fixture({ relation: 'dev-behind', prevalidated: true });
  await f.run();
  assert.equal(f.updates.length, 1);
  assert.deepEqual(f.outputs, { sha: 'main-sha', requiresValidation: 'false' });
});

test('diverged branches use a normal merge and request full validation', async () => {
  const f = fixture();
  await f.run();
  assert.equal(f.merges.length, 1);
  assert.equal(f.merges[0].base, 'dev');
  assert.equal(f.merges[0].head, 'main-sha');
  assert.equal(f.updates.length, 0);
  assert.deepEqual(f.outputs, { sha: 'merge-sha', requiresValidation: 'true' });
});

test('merge conflicts and a concurrent fast-forward race fail safely', async () => {
  const conflict = fixture({ conflict: true });
  await assert.rejects(conflict.run, /Merge conflict/);
  assert.deepEqual(conflict.outputs, {});
  const race = fixture({ relation: 'dev-behind', race: true });
  await assert.rejects(race.run, /Not a fast-forward/);
  assert.deepEqual(race.outputs, {});
});

test('verification rejects a merge that did not preserve main ancestry', async () => {
  const f = fixture({ verified: false });
  await assert.rejects(f.run, /not integrated/);
  assert.deepEqual(f.outputs, {});
});

test('only divergent merge syncs run all reusable checks on the resulting SHA', () => {
  for (const job of ['frontend', 'backend', 'versioning', 'bruno']) {
    assert.equal(workflow.jobs[job].needs, 'sync');
    assert.equal(workflow.jobs[job].if, "needs.sync.outputs.requiresValidation == 'true'");
    assert.equal(workflow.jobs[job].with.ref, '${{ needs.sync.outputs.sha }}');
    assert.ok(read(workflow.jobs[job].uses.split('/').pop()).concurrency.group.includes('${{ github.workflow }}'));
  }
});

test('commit validation keeps the published legacy message exception exact', () => {
  const config = require('../frontend/.commitlintrc.cjs');
  const ignores = config.ignores[0];
  const historical = require('./validate-commit-message.cjs').HISTORICAL_INVALID_MESSAGE;
  assert.equal(ignores(historical), false);
  assert.equal(ignores(`${historical} extra`), false);
  assert.equal(ignores('new invalid commit'), false);
  assert.deepEqual(config.rules, require('../frontend/.commitlintrc.json').rules);
});
