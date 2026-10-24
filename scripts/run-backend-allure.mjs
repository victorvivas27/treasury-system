import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureCoverage, configurationHash, coverageAttachments, prepareCoverageReport } from './allure-coverage.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = path.join(root, 'backend');
const cli = path.join(root, 'frontend/node_modules/allure/cli.js');
const [mode, suite, ...args] = process.argv.slice(2);
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const execute = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', ...options });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
};
const git = (...gitArgs) => {
  const result = spawnSync('git', gitArgs, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Cannot identify revision: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trimEnd();
};

function reconcile(runDir) {
  const runner = readJson(path.join(runDir, 'junit-summary.json'));
  const allure = { total: 0, passed: 0, failed: 0, broken: 0, skipped: 0, unknown: 0 };
  for (const name of readdirSync(path.join(runDir, 'allure-results')).filter((file) => file.endsWith('-result.json'))) {
    const result = readJson(path.join(runDir, 'allure-results', name));
    allure.total++;
    if (Object.hasOwn(allure, result.status) && result.status !== 'total') allure[result.status]++;
    else allure.unknown++;
  }
  return {
    runner, allure,
    matches: runner.total > 0 && runner.total === allure.total && runner.passed === allure.passed &&
      runner.failed === allure.failed + allure.broken && runner.skipped === allure.skipped && allure.unknown === 0,
  };
}

function generate(runDir, record) {
  const resolved = realpathSync(runDir);
  const expectedRoot = path.join(realpathSync(backend), 'build', 'allure', record.suite);
  const reportDir = path.join(resolved, 'allure-report');
  if (path.dirname(resolved) !== expectedRoot ||
    (existsSync(reportDir) && realpathSync(reportDir) !== reportDir)) {
    throw new Error('Refusing to clean HTML outside a verified backend run directory');
  }
  let validationError;
  try {
    prepareCoverageReport(runDir, record);
  } catch (error) {
    record.exitCode = record.runnerExitCode || 1;
    record.generations.push({ startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      generatorExitCode: null, validationError: error.message });
    writeJson(path.join(runDir, 'run.json'), record);
    console.error(error.message);
    return record.exitCode;
  }
  if (record.coverageRequested && record.coverage?.status !== 'available') {
    validationError = `Coverage unavailable: ${record.coverage?.reason ?? 'missing snapshot'}`;
  }
  const config = readJson(path.join(runDir, 'allurerc.json'));
  config.globalAttachments = coverageAttachments(runDir, root);
  config.plugins.awesome.options.singleFile = true;
  writeJson(path.join(runDir, 'allurerc.json'), config);
  try {
    record.counts = reconcile(runDir);
    if (!record.counts.matches) validationError = [validationError, 'Empty suite or JUnit/Allure count mismatch'].filter(Boolean).join('; ');
  } catch (error) {
    validationError = `Incomplete JUnit results: ${error.message}`;
  }
  const startedAt = new Date().toISOString();
  const generatorExitCode = execute(process.execPath, [cli, 'generate', path.join(runDir, 'allure-results'),
    '--config', path.join(runDir, 'allurerc.json'), '--clean']);
  if (generatorExitCode === 0) {
    try {
      if (!existsSync(path.join(reportDir, 'index.html'))) throw new Error('Missing HTML entry point');
      const { stats } = readJson(path.join(reportDir, 'summary.json'));
      if (!record.counts) throw new Error('Missing original test counts');
      record.counts.report = Object.fromEntries(['total', 'passed', 'failed', 'broken', 'skipped']
        .map((name) => [name, stats[name] ?? 0]));
      record.counts.reportMatches = Object.entries(record.counts.report)
        .every(([name, count]) => count === record.counts.allure[name]);
      if (!record.counts.reportMatches) throw new Error('Generated HTML count mismatch');
    } catch (error) {
      validationError = [validationError, error.message].filter(Boolean).join('; ');
    }
  }
  record.generations.push({ startedAt, finishedAt: new Date().toISOString(), generatorExitCode,
    validationError: validationError ?? null });
  record.finishedAt ??= new Date().toISOString();
  record.exitCode = record.runnerExitCode || generatorExitCode || (validationError ? 1 : 0);
  writeJson(path.join(runDir, 'run.json'), record);
  if (validationError) console.error(validationError);
  console.log(`Backend Allure run: ${runDir}`);
  console.log(`Runner: ${record.runnerExitCode}; generator: ${generatorExitCode}; result: ${record.exitCode}`);
  if (record.counts) console.log(JSON.stringify(record.counts));
  return record.exitCode;
}

function main() {
  if (!['unit', 'integration', 'combined'].includes(suite) || !['run', 'generate', 'open'].includes(mode)) {
    throw new Error('Usage: run-backend-allure.mjs run <unit|integration> [--tests ClassPattern] | generate/open <suite> <run-id>');
  }
  if (!existsSync(cli)) throw new Error('Install the existing frontend Allure CLI dependencies first');
  const runsRoot = path.join(backend, 'build', 'allure', suite);
  if (mode !== 'run') {
    if (args.length !== 1 || !/^[\w-]+$/.test(args[0])) throw new Error('Expected an explicit run-id');
    const runDir = path.join(runsRoot, args[0]);
    if (path.dirname(realpathSync(runDir)) !== path.join(realpathSync(backend), 'build', 'allure', suite)) {
      throw new Error('Backend run path is redirected outside its expected root');
    }
    const record = readJson(path.join(runDir, 'run.json'));
    if (record.suite !== suite || record.runId !== args[0]) throw new Error('Invalid run metadata');
    if (mode === 'generate') return generate(runDir, record);
    prepareCoverageReport(runDir, record);
    const report = path.join(runDir, 'allure-report');
    if (!existsSync(path.join(report, 'index.html')) || !existsSync(path.join(report, 'summary.json'))) {
      throw new Error('Generate this run report before opening it');
    }
    return execute(process.execPath, [cli, 'open', report, '--host', '127.0.0.1',
      '--config', path.join(runDir, 'allurerc.json')]);
  }
  if (args.length % 2 !== 0 || args.some((arg, index) => index % 2 === 0
    ? arg !== '--tests' : !/^[\w.*$]+$/.test(arg))) {
    throw new Error('Only explicit --tests ClassPattern filters are supported');
  }
  if (process.env.ALLURE_TESTPLAN_PATH) throw new Error('Unset ALLURE_TESTPLAN_PATH to preserve suite selection');
  if (suite === 'integration' || suite === 'combined') {
    const docker = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { cwd: root, encoding: 'utf8' });
    if (docker.status !== 0) throw new Error('Docker is required for complete PostgreSQL integration; no suite was started');
  }
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const runDir = path.join(runsRoot, runId);
  const status = git('-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-uall');
  const java = spawnSync('java', ['-version'], { encoding: 'utf8' });
  if (java.status !== 0) throw new Error('Java is unavailable');
  const versions = { node: process.versions.node, java: (java.stderr || java.stdout).split(/\r?\n/)[0],
    allure: readJson(path.join(root, 'frontend/node_modules/allure/package.json')).version,
    allureJava: '3.0.0' };
  mkdirSync(runsRoot, { recursive: true });
  if (existsSync(runDir)) throw new Error('Run identifier collision');
  mkdirSync(runDir);
  mkdirSync(path.join(runDir, 'allure-results'));
  const task = suite === 'combined' ? 'check' : `${suite}Test`;
  const reportTask = suite === 'combined' ? 'jacocoTestReport' : `jacoco${suite[0].toUpperCase()}${suite.slice(1)}TestReport`;
  const commandArgs = [task, ...args, reportTask, `-PallureSuite=${suite}`, `-PallureRunDir=${runDir}`, '--console=plain'];
  const record = { runId, application: 'backend', suite, scope: args.length ? 'partial' : 'complete',
    startedAt: new Date().toISOString(), sha: git('rev-parse', 'HEAD'), dirty: status.length > 0,
    changedPaths: status ? status.split(/\r?\n/).map((line) => line.slice(3)) : [],
    command: ['gradlew', ...commandArgs], versions, runnerExitCode: null, generations: [],
    coverageRequested: true, coverageConfigurationHash: configurationHash(path.join(backend, 'build.gradle')) };
  writeJson(path.join(runDir, 'run.json'), record);
  writeJson(path.join(runDir, 'allurerc.json'), {
    name: `Treasury System — Backend ${suite}`, output: path.join(runDir, 'allure-report'),
    plugins: { awesome: { options: { reportName: `Backend ${suite}`, open: false, publish: false } } },
  });
  const environment = { application: 'backend', suite, scope: record.scope, run_id: runId,
    started_at: record.startedAt, git_sha: record.sha, git_dirty: record.dirty, ...versions };
  writeFileSync(path.join(runDir, 'allure-results/environment.properties'), Object.entries(environment)
    .map(([key, value]) => `${key}=${String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n')}`).join('\n') + '\n');
  // Invoke the repository's wrapper entry point directly: no batch/shell quoting,
  // and still use the distribution pinned by gradle-wrapper.properties.
  record.runnerExitCode = execute('java', ['-Xmx64m', '-Xms64m', '-Dorg.gradle.appname=gradlew',
    '-classpath', path.join(backend, 'gradle/wrapper/gradle-wrapper.jar'),
    'org.gradle.wrapper.GradleWrapperMain', ...commandArgs], { cwd: backend });
  captureCoverage(runDir, record, path.join(runDir, 'coverage-source'), 'jacoco.xml', 'backend');
  writeJson(path.join(runDir, 'run.json'), record);
  return generate(runDir, record);
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
