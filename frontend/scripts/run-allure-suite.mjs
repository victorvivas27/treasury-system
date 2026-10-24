import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureCoverage, configurationHash, prepareCoverageReport } from '../../scripts/allure-coverage.mjs';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const suites = ['unit', 'integration', 'combined'];
const runsRoot = (suite) => path.join(frontend, 'build/allure', suite);
const [mode, ...args] = process.argv.slice(2);
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const git = (...gitArgs) => {
  const result = spawnSync('git', gitArgs, { cwd: frontend, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Cannot identify Git revision or working tree: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trimEnd();
};
const execute = (script, scriptArgs, env) => {
  const result = spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd: frontend, env, stdio: 'inherit',
  });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
};

function validateNode() {
  const [major, minor, patch] = process.versions.node.split('.').map(Number);
  if (!((major === 22 && (minor > 22 || (minor === 22 && patch >= 2))) ||
    (major === 24 && minor >= 15) || major >= 26)) {
    throw new Error('Allure pilot needs Node >=22.22.2 in 22.x, >=24.15 in 24.x, or >=26 (installed jsdom requirement)');
  }
}

function summarize(runDir) {
  const resultFiles = readdirSync(path.join(runDir, 'allure-results'))
    .filter((file) => file.endsWith('-result.json'));
  const allure = { total: resultFiles.length, passed: 0, failed: 0, broken: 0, skipped: 0, unknown: 0 };
  for (const file of resultFiles) {
    const { status } = readJson(path.join(runDir, 'allure-results', file));
    if (Object.hasOwn(allure, status) && status !== 'total') allure[status]++;
    else allure.unknown++;
  }
  const vitest = readJson(path.join(runDir, 'vitest.json'));
  const runner = {
    total: vitest.numTotalTests, passed: vitest.numPassedTests,
    failed: vitest.numFailedTests, skipped: vitest.numPendingTests,
    todo: vitest.numTodoTests ?? 0,
  };
  // Compare leaf tests, not suites/containers. The pilot does not enable retries.
  const matches = runner.total > 0 && allure.total === runner.total &&
    allure.passed === runner.passed && allure.failed + allure.broken === runner.failed &&
    allure.skipped === runner.skipped + runner.todo && allure.unknown === 0;
  return { runner, allure, matches };
}

function generate(runDir, record) {
  const actualRunDir = realpathSync(runDir);
  const expectedRoot = path.join(realpathSync(frontend), 'build', 'allure', record.suite);
  const reportDir = path.join(actualRunDir, 'allure-report');
  // --clean may delete only this execution's HTML, never inputs or redirected paths.
  if (!suites.includes(record.suite) || path.dirname(actualRunDir) !== expectedRoot ||
    (existsSync(reportDir) && realpathSync(reportDir) !== reportDir)) {
    throw new Error('Refusing to clean a report outside its verified pilot run directory');
  }
  const reportStartedAt = new Date().toISOString();
  let validationError;
  try {
    prepareCoverageReport(runDir, record);
  } catch (error) {
    record.exitCode = record.runnerExitCode || 1;
    record.generations.push({ startedAt: reportStartedAt, finishedAt: new Date().toISOString(),
      generatorExitCode: null, validationError: error.message });
    writeJson(path.join(runDir, 'run.json'), record);
    console.error(error.message);
    return record.exitCode;
  }
  if (record.coverageRequested && record.coverage?.status !== 'available') {
    validationError = `Coverage unavailable: ${record.coverage?.reason ?? 'missing snapshot'}`;
  }
  try {
    record.counts = summarize(runDir);
    if (!record.counts.matches) validationError = [validationError, 'Empty suite or mismatch between runner and Allure counts'].filter(Boolean).join('; ');
  } catch (error) {
    validationError = `Incomplete runner results: ${error.message}`;
  }
  const env = { ...process.env, TREASURY_ALLURE_RUN_DIR: runDir };
  const generatorExitCode = execute(path.join(frontend, 'node_modules/allure/cli.js'), [
    'generate', path.join(runDir, 'allure-results'), '--config', path.join(frontend, 'allurerc.mjs'), '--clean',
  ], env);
  if (generatorExitCode === 0) {
    try {
      if (!existsSync(path.join(reportDir, 'index.html'))) throw new Error('Missing HTML entry point');
      const { stats } = readJson(path.join(reportDir, 'summary.json'));
      if (!record.counts) throw new Error('Cannot reconcile report without original results');
      record.counts.report = Object.fromEntries(['total', 'passed', 'failed', 'broken', 'skipped']
        .map((key) => [key, stats[key] ?? 0]));
      record.counts.reportMatches = Object.entries(record.counts.report)
        .every(([key, value]) => value === record.counts.allure[key]);
      if (!record.counts.reportMatches) throw new Error('Generated report count mismatch');
    } catch (error) {
      validationError = [validationError, error.message].filter(Boolean).join('; ');
    }
  }
  const generation = {
    startedAt: reportStartedAt, finishedAt: new Date().toISOString(), generatorExitCode,
    validationError: validationError ?? null,
  };
  record.generations.push(generation);
  record.finishedAt ??= generation.finishedAt;
  record.exitCode = record.runnerExitCode || generatorExitCode || (validationError ? 1 : 0);
  writeJson(path.join(runDir, 'run.json'), record);
  if (validationError) console.error(validationError);
  console.log(`Allure run: ${runDir}`);
  console.log(`Runner: ${record.runnerExitCode}; generator: ${generatorExitCode}; result: ${record.exitCode}`);
  if (record.counts) console.log(JSON.stringify(record.counts));
  return record.exitCode;
}

function main() {
  validateNode();
  if (mode === 'generate' || mode === 'open') {
    // Preserve the phase 2 shorthand: generate <run-id> means unit.
    const [suite, runId] = args.length === 1 ? ['unit', args[0]] : args;
    if (![1, 2].includes(args.length) || !suites.includes(suite) || !/^[\w-]+$/.test(runId ?? '')) {
      throw new Error(`Expected ${mode} [unit|integration] <run-id>`);
    }
    const runDir = path.join(runsRoot(suite), runId);
    // Resolve actual paths too, so a symlink cannot redirect regeneration elsewhere.
    if (path.dirname(realpathSync(runDir)) !== path.join(realpathSync(frontend), 'build', 'allure', suite)) {
      throw new Error('Run directory is outside the pilot output root');
    }
    const record = readJson(path.join(runDir, 'run.json'));
    if (record.suite !== suite || record.runId !== runId) throw new Error('Invalid Allure run metadata');
    if (mode === 'generate') return generate(runDir, record);
    prepareCoverageReport(runDir, record);
    const reportDir = path.join(runDir, 'allure-report');
    if (!existsSync(path.join(reportDir, 'index.html')) || !existsSync(path.join(reportDir, 'summary.json'))) {
      throw new Error('Generate this run report before opening it');
    }
    return execute(path.join(frontend, 'node_modules/allure/cli.js'), [
      'open', reportDir, '--host', '127.0.0.1', '--config', path.join(frontend, 'allurerc.mjs'),
    ], { ...process.env, TREASURY_ALLURE_RUN_DIR: runDir });
  }
  if (!suites.includes(mode) || args.some((arg) => arg !== '--coverage' &&
    !/^(?:src\/)[\w./-]+\.(?:test|spec)\.(?:ts|tsx)$/.test(arg))) {
    throw new Error('Usage: run-allure-suite.mjs <unit|integration> [--coverage] [src/path.test.ts ...] | generate/open [suite] <run-id>');
  }
  if (process.env.ALLURE_TESTPLAN_PATH) throw new Error('Unset ALLURE_TESTPLAN_PATH: pilot must not silently select tests');
  const packageVersions = Object.fromEntries(['allure', 'allure-vitest', 'vitest', '@vitest/runner', 'jsdom']
    .map((name) => [name, readJson(path.join(frontend, 'node_modules', name, 'package.json')).version]));
  const status = git('-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-uall');
  const sha = git('rev-parse', 'HEAD');
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const runDir = path.join(runsRoot(mode), runId);
  mkdirSync(runsRoot(mode), { recursive: true });
  if (existsSync(runDir)) throw new Error('Run identifier collision');
  mkdirSync(runDir);
  mkdirSync(path.join(runDir, 'allure-results'));
  const record = {
    runId, suite: mode, scope: args.some((arg) => arg !== '--coverage') ? 'partial' : 'complete',
    startedAt: new Date().toISOString(), sha, dirty: status.length > 0,
    changedPaths: status ? status.split(/\r?\n/).map((line) => line.slice(3)) : [],
    command: mode === 'combined' ? ['node', 'node_modules/vitest/vitest.mjs', 'run', ...args]
      : ['node', 'scripts/run-test-suite.mjs', mode, ...args],
    versions: { node: process.versions.node, ...packageVersions },
    application: 'frontend', coverageRequested: args.includes('--coverage'),
    coverageConfigurationHash: configurationHash(path.join(frontend, 'vite.config.ts')),
    runnerExitCode: null, generations: [],
  };
  writeJson(path.join(runDir, 'run.json'), record);
  writeJson(path.join(runDir, 'environment.json'), {
    application: 'frontend', suite: mode, scope: record.scope, run_id: runId,
    ...(mode === 'integration' ? { integration_boundary: 'Application layers with mocked HTTP; no real backend' } : {}),
    started_at: record.startedAt, git_sha: sha, git_dirty: String(record.dirty),
    ...record.versions,
  });
  record.runnerExitCode = mode === 'combined'
    ? execute(path.join(frontend, 'node_modules/vitest/vitest.mjs'), ['run', ...args], {
      ...process.env, TEST_SUITE: 'combined', TREASURY_ALLURE_RUN_DIR: runDir,
    })
    : execute(path.join(frontend, 'scripts/run-test-suite.mjs'), [mode, ...args], {
      ...process.env, TREASURY_ALLURE_RUN_DIR: runDir,
    });
  if (record.coverageRequested) {
    captureCoverage(runDir, record, path.join(frontend, 'coverage', mode), 'coverage-summary.json', 'frontend');
  } else {
    record.coverage = { status: 'not-requested', reason: 'Run with --coverage to measure this execution' };
  }
  writeJson(path.join(runDir, 'run.json'), record);
  return generate(runDir, record);
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
