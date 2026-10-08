const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const tool = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'));
const yaml = tool('yaml');
const root = path.join(__dirname, '../.github/workflows');
const read = file => yaml.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const workflow = read('00-pr-validation.yml');
const children = ['01-commit-lint.yml', '02-frontend-ci.yml', '03-backend-ci.yml',
  '04-bruno-tests.yml', '05-versioning-ci.yml'];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function select(files) {
  const outputs = {};
  await new AsyncFunction('github', 'context', 'core', workflow.jobs.changes.steps[0].with.script)(
    { rest: { pulls: { listFiles: {} } }, paginate: async () => files },
    { repo: { owner: 'owner', repo: 'repo' }, payload: { pull_request: { number: 1 } } },
    { setOutput: (name, value) => { outputs[name] = value; } },
  );
  return outputs;
}

test('only one workflow handles pull requests; existing workflows remain reusable', () => {
  const triggered = fs.readdirSync(root).filter(file => read(file).on.pull_request);
  assert.deepEqual(triggered, ['00-pr-validation.yml']);
  assert.deepEqual(workflow.on.pull_request.branches, ['dev', 'main']);
  for (const file of children) {
    assert.ok(Object.hasOwn(read(file).on, 'workflow_call'), file);
    assert.ok(read(file).on.push, file);
    assert.notEqual(read(file).concurrency.group, workflow.concurrency.group, file);
  }
  for (const [job, file] of Object.entries({ commits: children[0], frontend: children[1],
    backend: children[2], bruno: children[3], versioning: children[4] })) {
    assert.equal(workflow.jobs[job].uses, `./.github/workflows/${file}`);
  }
  const config = read(children[0]).jobs['validate-commits'].steps[1].with.configFile;
  assert.ok(fs.existsSync(path.join(__dirname, '..', config)));
});

test('runs only applicable validations, including renamed files', async () => {
  assert.deepEqual(await select([{ filename: 'frontend/src/App.tsx' }]),
    { frontend: 'true', backend: 'false', bruno: 'false', versioning: 'false' });
  assert.deepEqual(await select([{ filename: 'backend/src/Service.java' }]),
    { frontend: 'false', backend: 'true', bruno: 'true', versioning: 'false' });
  assert.deepEqual(await select([{ filename: 'README.md' }]),
    { frontend: 'false', backend: 'false', bruno: 'false', versioning: 'false' });
  assert.equal((await select([{ filename: 'api-tests/test.yml' }])).bruno, 'true');
  assert.equal((await select([{ filename: 'VERSION' }])).versioning, 'true');
  assert.equal((await select([{ filename: 'scripts/test-pr-validation.cjs' }])).versioning, 'true');
  assert.equal((await select([{ filename: 'docs/old.tsx', previous_filename: 'frontend/src/old.tsx' }])).frontend, 'true');
});

test('workflow changes and truncated file lists validate all areas', async () => {
  const expected = { frontend: 'true', backend: 'true', bruno: 'true', versioning: 'true' };
  assert.deepEqual(await select([{ filename: '.github/workflows/00-pr-validation.yml' }]), expected);
  assert.deepEqual(await select(Array.from({ length: 3000 }, () => ({ filename: 'docs/item.md' }))), expected);
});

test('final result rejects failures, cancellations and skipped required jobs', async () => {
  assert.equal(workflow.jobs.result.if, 'always()');
  assert.deepEqual(workflow.jobs.result.needs, ['changes', 'commits', 'frontend', 'backend', 'bruno', 'versioning']);
  const run = async results => {
    const failures = [];
    await new AsyncFunction('process', 'core', workflow.jobs.result.steps[0].with.script)(
      { env: { VALIDATION_RESULTS: JSON.stringify(results) } },
      { setFailed: message => failures.push(message) },
    );
    return failures;
  };
  const base = { changes: { result: 'success' }, commits: { result: 'success' }, frontend: { result: 'skipped' } };
  assert.deepEqual(await run(base), []);
  assert.deepEqual(await run({ ...base, frontend: { result: 'failure' } }), ['frontend: failure']);
  assert.deepEqual(await run({ ...base, frontend: { result: 'cancelled' } }), ['frontend: cancelled']);
  assert.deepEqual(await run({ ...base, commits: { result: 'skipped' } }), ['commits: skipped']);
});

test('promotion title comes from the exact latest dev commit and drops the commit body', async () => {
  const titleJob = read(children[0]).jobs['promotion-title'];
  assert.equal(titleJob.permissions['pull-requests'], 'write');
  assert.ok(titleJob.if.includes("head.ref == 'dev'"));
  assert.equal(read(children[0]).jobs['validate-commits'].permissions['pull-requests'], 'read');
  const changes = [];
  let message = 'fix(ui): corregir paneles\n\nDetalle del cambio';
  const candidate = { number: 42, state: 'open', title: 'Dev', base: { ref: 'main' },
    head: { ref: 'dev', sha: 'latest', repo: { full_name: 'owner/repo' } } };
  const run = async pr => new AsyncFunction('github', 'context', 'core', titleJob.steps[0].with.script)(
    { rest: {
      pulls: { get: async () => ({ data: pr }), update: async args => changes.push(args) },
      repos: { getCommit: async args => {
        assert.equal(args.ref, 'latest');
        return { data: { commit: { message } } };
      } },
    } },
    { repo: { owner: 'owner', repo: 'repo' }, payload: { pull_request: { number: 42, head: { sha: 'latest' } } } },
    { info: () => {} },
  );
  await run(candidate);
  assert.equal(changes[0].title, 'fix(ui): corregir paneles');
  await run({ ...candidate, title: changes[0].title });
  assert.equal(changes.length, 1);
  await run({ ...candidate, head: { ...candidate.head, ref: 'feature/test' } });
  await run({ ...candidate, head: { ...candidate.head, repo: { full_name: 'external/repo' } } });
  assert.equal(changes.length, 1);
  await assert.rejects(run({ ...candidate, head: { ...candidate.head, sha: 'newer' } }), /changed during validation/);
  message = 'Merge pull request #42 from owner/feature';
  await run(candidate);
  assert.equal(changes[1].title, 'chore: Merge pull request #42 from owner/feature');
});
