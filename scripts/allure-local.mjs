import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sessionsRoot = path.join(root, 'frontend/build/allure/sessions');
const [mode, ...args] = process.argv.slice(2);
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const runRoot = (application, suite) => path.join(root, application, 'build/allure', suite);
const directories = (dir) => existsSync(dir)
  ? readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name) : [];

function child(application, command, suite, ...rest) {
  const frontend = application === 'frontend';
  const script = path.join(root, frontend ? 'frontend/scripts/run-allure-suite.mjs' : 'scripts/run-backend-allure.mjs');
  const commandArgs = frontend
    ? (command === 'run' ? [suite, '--coverage'] : [command, suite, ...rest])
    : [command, suite, ...rest];
  return spawnSync(process.execPath, [script, ...commandArgs], {
    cwd: frontend ? path.join(root, 'frontend') : root, stdio: 'inherit',
  }).status ?? 1;
}

function show(session) {
  console.table(session.runs.map((run) => ({
    application: run.application, suite: run.suite, tests: run.tests?.total ?? 'missing',
    passed: run.tests?.passed ?? 'missing', coverage: run.coverage?.status ?? 'missing',
    lines: run.coverage?.metrics?.lines?.percent ?? 'unavailable', exit: run.exitCode,
  })));
  console.log(`Session: ${session.sessionId}; exit: ${session.exitCode}`);
  console.log('Coverage is per application/suite. Do not add or average these percentages.');
  for (const run of session.runs.filter((entry) => entry.runId)) {
    console.log(`Open: node scripts/allure-local.mjs open ${run.application} ${run.suite} ${run.runId}`);
  }
}

function main() {
  if (mode === 'generate' || mode === 'open') {
    const [application, suite, runId] = args;
    if (args.length !== 3 || !['frontend', 'backend'].includes(application) ||
      !['unit', 'integration'].includes(suite) || !/^[\w-]+$/.test(runId ?? '')) throw new Error('Expected <frontend|backend> <unit|integration> <run-id>');
    return child(application, mode, suite, runId);
  }
  if (mode === 'show') {
    if (args.length !== 1 || !/^[\w-]+$/.test(args[0])) throw new Error('Expected show <session-id>');
    const dir = path.join(sessionsRoot, args[0]);
    if (path.dirname(realpathSync(dir)) !== realpathSync(sessionsRoot)) throw new Error('Session path is redirected');
    const session = readJson(path.join(dir, 'session.json'));
    if (session.sessionId !== args[0]) throw new Error('Session metadata mismatch');
    show(session);
    return session.exitCode;
  }
  if (mode !== 'run' || args.length) throw new Error('Usage: allure-local.mjs run | show <session-id> | generate/open <application> <suite> <run-id>');
  const [major, minor, patch] = process.versions.node.split('.').map(Number);
  if (!((major === 22 && (minor > 22 || minor === 22 && patch >= 2)) || major === 24 && minor >= 15 || major >= 26)) {
    throw new Error('Use Node compatible with installed jsdom: >=22.22.2 in 22.x, >=24.15 in 24.x, or >=26');
  }
  for (const [command, commandArgs] of [['java', ['-version']], ['docker', ['info', '--format', '{{.ServerVersion}}']]]) {
    if (spawnSync(command, commandArgs, { cwd: root, stdio: 'ignore' }).status !== 0) {
      throw new Error(`${command} preflight failed; no tests started`);
    }
  }
  if (!existsSync(path.join(root, 'frontend/node_modules/allure/cli.js'))) throw new Error('Install existing frontend dependencies first');
  const sessionId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const dir = path.join(sessionsRoot, sessionId);
  mkdirSync(dir, { recursive: true });
  const session = { sessionId, startedAt: new Date().toISOString(), runs: [], exitCode: 0 };
  const save = () => writeFileSync(path.join(dir, 'session.json'), JSON.stringify(session, null, 2) + '\n');
  save();
  for (const application of ['frontend', 'backend']) {
    for (const suite of ['unit', 'integration']) {
      const runs = runRoot(application, suite);
      const before = new Set(directories(runs));
      const exitCode = child(application, 'run', suite);
      const added = directories(runs).filter((id) => !before.has(id));
      const record = added.length === 1 && existsSync(path.join(runs, added[0], 'run.json'))
        ? readJson(path.join(runs, added[0], 'run.json')) : undefined;
      const complete = record?.scope === 'complete' && record?.counts?.matches && record?.counts?.reportMatches &&
        record?.coverage?.status === 'available' && record?.counts?.runner?.skipped === 0 &&
        (record?.counts?.runner?.todo ?? 0) === 0;
      session.runs.push({ application, suite, runId: record?.runId, exitCode: exitCode || (complete ? 0 : 1),
        sha: record?.sha, dirty: record?.dirty, tests: record?.counts?.runner, coverage: record?.coverage,
        problem: added.length !== 1 ? 'Cannot identify one unique new execution' : complete ? null : 'Incomplete suite or report' });
      if (session.runs.at(-1).exitCode !== 0) session.exitCode = 1;
      save();
    }
  }
  session.finishedAt = new Date().toISOString();
  save();
  show(session);
  console.log(`Manifest: ${path.join(dir, 'session.json')}`);
  return session.exitCode;
}

try { process.exitCode = main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
