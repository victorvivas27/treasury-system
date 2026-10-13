const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const yaml = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'))('yaml');
const read = file => yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows', file), 'utf8'));
const workflow = read('10-sync-main-dev.yml');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function fixture({ integrated = false, conflict = false, verified = true } = {}) {
  const merges = [], outputs = {};
  let comparisons = 0;
  const github = { rest: {
    git: { getRef: async ({ ref }) => ({ data: { object: { sha: ref === 'heads/main' ? 'main-sha' : 'dev-sha' } } }) },
    repos: {
      compareCommits: async () => ({ data: { merge_base_commit: {
        sha: (++comparisons === 1 ? integrated : verified) ? 'main-sha' : 'old-base',
      } } }),
      merge: async args => {
        if (conflict) throw Object.assign(new Error('Merge conflict'), { status: 409 });
        merges.push(args);
      },
    },
  } };
  return { merges, outputs, run: () => new AsyncFunction('github', 'context', 'core', workflow.jobs.sync.steps[0].with.script)(
    github, { repo: { owner: 'owner', repo: 'repo' } },
    { info: () => {}, setOutput: (key, value) => { outputs[key] = value; } },
  ) };
}

test('sync runs for main pushes, manual retries and bot releases', () => {
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'));
  assert.ok(Object.hasOwn(workflow.on, 'workflow_call'));
  assert.equal(read('06-release-please.yml').jobs['sync-dev'].uses, './.github/workflows/10-sync-main-dev.yml');
  assert.equal(read('06-release-please.yml').jobs['sync-dev'].needs, 'publish');
  assert.equal(workflow.jobs.sync.concurrency['cancel-in-progress'], false);
});

test('main is merged into dev using its pinned SHA without rewriting history', async () => {
  const f = fixture();
  await f.run();
  assert.equal(f.merges.length, 1);
  assert.equal(f.merges[0].base, 'dev');
  assert.equal(f.merges[0].head, 'main-sha');
  assert.equal(f.outputs.sha, 'dev-sha');
});

test('already synchronized branches are idempotent', async () => {
  const f = fixture({ integrated: true });
  await f.run();
  assert.equal(f.merges.length, 0);
  assert.equal(f.outputs.sha, 'dev-sha');
});

test('content conflicts fail without reporting success or replacing dev', async () => {
  const f = fixture({ conflict: true });
  await assert.rejects(f.run, /Merge conflict/);
  assert.deepEqual(f.outputs, {});
});

test('verification rejects a merge that did not preserve main ancestry', async () => {
  const f = fixture({ verified: false });
  await assert.rejects(f.run, /not integrated/);
  assert.deepEqual(f.outputs, {});
});

test('bot merges explicitly validate the synchronized SHA in all reusable checks', () => {
  for (const job of ['frontend', 'backend', 'versioning', 'bruno']) {
    assert.equal(workflow.jobs[job].needs, 'sync');
    assert.equal(workflow.jobs[job].with.ref, '${{ needs.sync.outputs.sha }}');
    assert.ok(read(workflow.jobs[job].uses.split('/').pop()).concurrency.group.includes('${{ github.workflow }}'));
  }
});
