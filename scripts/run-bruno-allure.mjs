import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiCoverage, allureRequests, brunoResults } from './bruno-coverage.mjs';
import { brunoFixtureSettings, brunoRequestFixtures } from './bruno-fixture.mjs';
import { captureCoverage, configurationHash, coverageAttachments, prepareCoverageReport } from './allure-coverage.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = path.join(root, 'backend');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const git = (...args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Cannot identify Bruno revision');
  return result.stdout.trim();
};
const execute = (command, args, cwd = root, environment = process.env) => {
  const result = spawnSync(command, args, { cwd, env: environment, stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
};
const gradle = (...args) => execute('java', ['-Xmx64m', '-classpath', path.join(backend, 'gradle/wrapper/gradle-wrapper.jar'),
  'org.gradle.wrapper.GradleWrapperMain', '--no-daemon', '--console=plain', ...args], backend);

// Requires an isolated backend started with prepareBrunoAgent's loopback TCP agent.
async function main() {
  const baseUrl = process.env.BRUNO_BASE_URL ?? 'http://localhost:5055/tesoreria/api/v1';
  const base = new URL(baseUrl);
  if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || base.username || base.password ||
      base.search || base.hash || !base.pathname.endsWith('/api/v1')) throw new Error('Bruno coverage requires an isolated loopback test backend');
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const run = path.join(backend, 'build/allure/bruno', runId);
  mkdirSync(path.join(run, 'allure-results'), { recursive: true });
  const record = { runId, application: 'backend', suite: 'bruno', scope: 'complete', collection: 'apoderado',
    startedAt: new Date().toISOString(), sha: git('rev-parse', 'HEAD'), dirty: Boolean(git('status', '--porcelain', '-uall')),
    coverageConfigurationHash: configurationHash(path.join(backend, 'build.gradle')), runnerExitCode: null, exitCode: 1 };
  const raw = path.join(mkdtempSync(path.join(tmpdir(), 'treasury-bruno-')), 'results.json');
  const environmentName = `coverage-${randomUUID()}`;
  const environmentFile = path.join(root, 'api-tests/environments', `${environmentName}.yml`);
  try {
    let seeded;
    if (process.env.BRUNO_SEED_DATABASE === 'true') {
      const fixture = brunoFixtureSettings();
      const result = execute('java', ['-Xmx64m', '-classpath', path.join(backend, 'gradle/wrapper/gradle-wrapper.jar'),
        'org.gradle.wrapper.GradleWrapperMain', '--no-daemon', '--console=plain', 'brunoSeedDatabase'], backend,
        fixture.environment);
      if (result !== 0) throw new Error('Cannot prepare disposable Bruno database');
      seeded = fixture.credentials;
    }
    const credentials = seeded ?? { adminToken: process.env.BRUNO_ADMIN_TOKEN,
      Admin_Email: process.env.BRUNO_ADMIN_EMAIL, Admin_Password: process.env.BRUNO_ADMIN_PASSWORD };
    if (!credentials.Admin_Email || !credentials.Admin_Password) throw new Error('Provide BRUNO_ADMIN_EMAIL/PASSWORD for the isolated test backend, or enable BRUNO_SEED_DATABASE on an empty disposable database');
    mkdirSync(path.dirname(environmentFile), { recursive: true });
    write(environmentFile, { name: environmentName, variables: Object.entries({ Url_Base: baseUrl, ...brunoRequestFixtures, ...credentials })
      .filter(([, value]) => value !== undefined).map(([name, value]) => ({ name, value, type: 'text', enabled: true })) });
    if (gradle('brunoApiInventory', 'resetBrunoCoverage') !== 0) throw new Error('Cannot prepare isolated Bruno coverage');
    const pnpmArgs = ['dlx', '@usebruno/cli', 'run', './apoderado', '-r', '--env', environmentName,
      '--env-var', `Url_Base=${baseUrl}`, '--reporter-json', raw];
    if (process.env.BRUNO_CLI_PATH) {
      if (!existsSync(process.env.BRUNO_CLI_PATH)) throw new Error('BRUNO_CLI_PATH does not exist');
      record.runnerExitCode = execute(process.execPath, [process.env.BRUNO_CLI_PATH, ...pnpmArgs.slice(2)], path.join(root, 'api-tests'));
    } else if (process.platform === 'win32') {
      const pnpmCli = process.env.npm_execpath ?? path.join(process.env.APPDATA ?? '', 'npm/node_modules/pnpm/bin/pnpm.cjs');
      if (!existsSync(pnpmCli)) throw new Error('Run this script with pnpm exec node on Windows');
      record.runnerExitCode = execute(process.execPath, [pnpmCli, ...pnpmArgs], path.join(root, 'api-tests'));
    } else record.runnerExitCode = execute('pnpm', pnpmArgs, path.join(root, 'api-tests'));
    if (record.runnerExitCode !== 0) throw new Error('Bruno tests failed; evidence is not publishable');
    const results = brunoResults(json(raw));
    const coverage = apiCoverage(json(path.join(backend, 'build/bruno/operations.json')), results,
      baseUrl);
    unlinkSync(raw);
    const counts = { total: results.length, passed: results.filter(item => item.status === 'passed').length,
      failed: results.filter(item => item.status === 'failed').length, skipped: results.filter(item => item.status === 'skipped').length };
    if (counts.passed !== counts.total || !coverage.metric.covered) throw new Error('Bruno has skipped, failed or no checked API requests');
    const allure = allureRequests(coverage.requests);
    for (const result of allure) write(path.join(run, 'allure-results', `${result.uuid}-result.json`), result);
    if (gradle('dumpBrunoCoverage', 'jacocoBrunoReport') !== 0) throw new Error('Cannot capture Bruno execution data');
    const source = path.join(backend, 'build/bruno/coverage-source');
    write(path.join(source, 'api-coverage.json'), coverage);
    cpSync(path.join(backend, 'build/bruno/jacoco.exec'), path.join(run, 'jacoco.exec'));
    captureCoverage(run, record, source, 'jacoco.xml', 'backend', { endpoints: coverage.metric });
    if (record.coverage.status !== 'available') throw new Error(record.coverage.reason);
    prepareCoverageReport(run, record);
    const config = path.join(run, 'allurerc.json');
    write(config, { name: 'Treasury System — Bruno API · Apoderado', output: path.join(run, 'allure-report'),
      globalAttachments: coverageAttachments(run, root),
      plugins: { awesome: { options: { singleFile: true, open: false, publish: false } } } });
    if (execute(process.execPath, [path.join(root, 'frontend/node_modules/allure/cli.js'), 'generate',
      path.join(run, 'allure-results'), '--config', config]) !== 0) throw new Error('Cannot generate Bruno Allure HTML');
    const stats = json(path.join(run, 'allure-report/summary.json')).stats;
    record.counts = { runner: counts, matches: allure.length === counts.total,
      reportMatches: stats.total === counts.total && stats.passed === counts.passed };
    if (!record.counts.reportMatches) throw new Error('Bruno/Allure counts do not match');
    record.exitCode = 0;
    record.finishedAt = new Date().toISOString();
    write(path.join(run, 'run.json'), record);
    const staging = path.join(backend, 'build/bruno/ci-evidence');
    mkdirSync(staging); // Never merge evidence from different executions.
    cpSync(path.join(run, 'coverage/detail/html'), staging, { recursive: true });
    cpSync(run, path.join(staging, 'allure'), { recursive: true });
    write(path.join(staging, 'receipt.json'), { schema: 1, application: 'backend', suite: 'bruno', sha: record.sha,
      fingerprint: process.env.INPUT_FINGERPRINT ?? null, workflowRunId: process.env.GITHUB_RUN_ID ?? null,
      runId, valid: !record.dirty, tests: counts, coverage: record.coverage });
    console.log(`Bruno coverage report: ${run}`);
  } catch (error) {
    record.error = error.message;
    record.finishedAt = new Date().toISOString();
    write(path.join(run, 'run.json'), record);
    throw error;
  } finally {
    try { unlinkSync(raw); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { unlinkSync(environmentFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
