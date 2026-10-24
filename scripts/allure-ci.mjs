import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [application] = process.argv.slice(2);
if (process.argv.length !== 3 || !['frontend', 'backend'].includes(application)) throw new Error('Expected frontend or backend');
const app = path.join(root, application);
const runs = path.join(app, 'build/allure/combined');
const before = new Set(existsSync(runs) ? readdirSync(runs) : []);
const frontend = application === 'frontend';
const child = spawnSync(process.execPath, [path.join(root, frontend ? 'frontend/scripts/run-allure-suite.mjs' : 'scripts/run-backend-allure.mjs'),
  ...(frontend ? ['combined', '--coverage'] : ['run', 'combined'])], { cwd: frontend ? app : root, stdio: 'inherit' });
let exitCode = child.status ?? 1;
try {
  const added = readdirSync(runs).filter(id => !before.has(id));
  if (added.length !== 1) throw new Error('Expected one new combined run');
  const run = path.join(runs, added[0]);
  const record = JSON.parse(readFileSync(path.join(run, 'run.json'), 'utf8'));
  const staging = path.join(app, 'build/allure/ci-evidence');
  mkdirSync(staging); // Fresh checkout expected; never merge old evidence.
  if (record.coverage.status === 'available') {
    cpSync(path.join(run, frontend ? 'coverage/detail' : 'coverage/detail/html'), staging, { recursive: true });
  }
  cpSync(run, path.join(staging, 'allure'), { recursive: true });
  const valid = exitCode === 0 && record.exitCode === 0 && record.scope === 'complete' &&
    record.counts?.matches && record.counts?.reportMatches && record.counts?.runner?.skipped === 0 &&
    (record.counts?.runner?.todo ?? 0) === 0 && record.coverage.status === 'available';
  const receipt = { schema: 1, application, suite: 'combined', sha: record.sha,
    fingerprint: process.env.INPUT_FINGERPRINT ?? null, runId: record.runId,
    workflowRunId: process.env.GITHUB_RUN_ID ?? null, valid: Boolean(valid), tests: record.counts?.runner,
    coverage: record.coverage, generatedAt: new Date().toISOString() };
  writeFileSync(path.join(staging, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  if (!valid) exitCode ||= 1;
} catch (error) { console.error(error.message); exitCode ||= 1; }
process.exitCode = exitCode;
