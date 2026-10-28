const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const yaml = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'))('yaml');
const read = file => yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows', file), 'utf8'));
const workflow = read('10-sync-main-dev.yml');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function fixture({ relation = 'diverged', conflict = false, verified = true, race = false,
  prevalidated = false, validatedSha = 'main-sha', staleRef = false, emptyMergeResponse = false } = {}) {
  const merges = [], updates = [], outputs = {}, reads = [];
  let mainUpdated = false;
  const github = { rest: {
    git: {
      getRef: async ({ ref }) => {
        reads.push(ref);
        return { data: { object: { sha: ref === 'heads/main' ? 'main-sha'
          : mainUpdated && !staleRef ? (relation === 'diverged' ? 'merge-sha' : 'main-sha') : 'dev-sha' } } };
      },
      updateRef: async args => {
        updates.push(args);
        if (race) throw Object.assign(new Error('Not a fast-forward'), { status: 422 });
        mainUpdated = true;
        return { data: { object: { sha: 'main-sha' } } };
      },
    },
    repos: {
      compareCommits: async ({ base, head }) => {
        if (base === 'main-sha') {
          const included = (verified && ['main-sha', 'merge-sha'].includes(head))
            || (['dev', 'dev-sha'].includes(head) && relation === 'dev-ahead');
          return { data: { merge_base_commit: { sha: included ? 'main-sha' : 'old-base' } } };
        }
        if (head === 'main-sha') return { data: { merge_base_commit: { sha: relation === 'dev-behind' ? 'dev-sha' : 'old-base' } } };
        return { data: { merge_base_commit: { sha: verified ? 'main-sha' : 'old-base' } } };
      },
      merge: async args => {
        if (conflict) throw Object.assign(new Error('Merge conflict'), { status: 409 });
        merges.push(args);
        mainUpdated = true;
        return { data: emptyMergeResponse ? undefined : { sha: 'merge-sha' } };
      },
    },
  } };
  return { merges, updates, outputs, reads, run: () => new AsyncFunction('github', 'context', 'core', 'process', workflow.jobs.sync.steps[0].with.script)(
    github, { repo: { owner: 'owner', repo: 'repo' } },
    { info: () => {}, setOutput: (key, value) => { outputs[key] = value; } },
    { env: { ALREADY_VALIDATED: String(prevalidated), VALIDATED_SHA: validatedSha } },
  ) };
}

test('sync is called by the validated main coordinator or a manual retry', () => {
  assert.equal(workflow.on.push, undefined);
  assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'));
  assert.ok(Object.hasOwn(workflow.on, 'workflow_call'));
  assert.equal(read('06-release-please.yml').jobs['sync-dev'].uses, './.github/workflows/10-sync-main-dev.yml');
  assert.deepEqual(read('06-release-please.yml').jobs['sync-dev'].needs, ['main-checks', 'release-result', 'validate-release']);
  assert.equal(read('06-release-please.yml').jobs['sync-dev'].with.already_validated, true);
  assert.equal(read('06-release-please.yml').jobs['sync-dev'].with.validated_sha, '${{ needs.validate-release.outputs.sha || needs.main-checks.outputs.sha }}');
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

test('a missing or stale validated SHA cannot skip fast-forward validation', async () => {
  for (const validatedSha of ['', 'previous-main-sha']) {
    const f = fixture({ relation: 'dev-behind', prevalidated: true, validatedSha });
    await f.run();
    assert.equal(f.outputs.requiresValidation, 'true');
  }
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

for (const relation of ['dev-behind', 'diverged']) {
  test(`sync verifies the returned commit even when getRef remains stale (${relation})`, async () => {
    const f = fixture({ relation, staleRef: true });
    await f.run();
    assert.equal(f.outputs.sha, relation === 'dev-behind' ? 'main-sha' : 'merge-sha');
    assert.equal(f.outputs.requiresValidation, 'true');
    assert.equal(f.reads.filter(ref => ref === 'heads/dev').length, 1);
  });
}

test('a concurrent no-op merge with an empty response still verifies the current dev commit', async () => {
  const f = fixture({ emptyMergeResponse: true });
  await f.run();
  assert.deepEqual(f.outputs, { sha: 'merge-sha', requiresValidation: 'true' });
});

test('an empty already-validated input retains validation on push', async () => {
  const f = fixture({ relation: 'dev-behind', prevalidated: '' });
  await f.run();
  assert.equal(f.outputs.requiresValidation, 'true');
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
