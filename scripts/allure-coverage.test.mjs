import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { captureCoverage, parseCoverage, prepareCoverageReport } from './allure-coverage.mjs';

test('JaCoCo uses root counters without double-counting nested classes', () => {
  const xml = '<report><package><class><counter type="LINE" covered="999" missed="0"/></class></package>' +
    '<counter type="LINE" missed="4" covered="6"/><counter type="BRANCH" missed="3" covered="1"/>' +
    '<counter type="METHOD" covered="2" missed="2"/></report>';
  assert.equal(parseCoverage(xml, 'backend').lines.percent, 60);
  assert.equal(parseCoverage(xml, 'backend').branches.percent, 25);
  assert.equal(parseCoverage(xml, 'backend').methods.percent, 50);
  assert.throws(() => parseCoverage('<report/>', 'backend'));
});

test('Vitest ratios use actual numerator/denominator and reject empty or impossible metrics', () => {
  const total = { lines: { covered: 2, total: 3 }, branches: { covered: 1, total: 4 }, functions: { covered: 1, total: 2 } };
  assert.equal(parseCoverage(JSON.stringify({ total }), 'frontend').lines.percent, 66.67);
  total.lines.total = 0;
  assert.throws(() => parseCoverage(JSON.stringify({ total }), 'frontend'));
  total.lines.total = 1;
  assert.throws(() => parseCoverage(JSON.stringify({ total }), 'frontend'));
});

test('Snapshots reject stale input, preserve ratios, and reject tampered detail on regeneration', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'treasury-coverage-test-'));
  try {
    const source = path.join(base, 'source');
    mkdirSync(source);
    const input = path.join(source, 'coverage-summary.json');
    writeFileSync(input, JSON.stringify({ total: Object.fromEntries(['lines', 'branches', 'functions']
      .map((name) => [name, { covered: 3, total: 5 }])) }));
    writeFileSync(path.join(source, 'index.html'), '<html>Coverage detail</html>');
    const staleRun = path.join(base, 'stale'); mkdirSync(staleRun);
    utimesSync(input, new Date(0), new Date(0));
    const stale = { runnerExitCode: 0, startedAt: new Date().toISOString() };
    captureCoverage(staleRun, stale, source, 'coverage-summary.json', 'frontend');
    assert.equal(stale.coverage.status, 'unavailable');
    utimesSync(input, new Date(), new Date());
    const run = path.join(base, 'run'); mkdirSync(run); mkdirSync(path.join(run, 'allure-results'));
    const record = { runId: 'example', suite: 'unit', scope: 'partial', sha: 'example', dirty: true,
      runnerExitCode: 0, startedAt: new Date(Date.now() - 1000).toISOString() };
    captureCoverage(run, record, source, 'coverage-summary.json', 'frontend');
    assert.equal(record.coverage.status, 'available', record.coverage.reason);
    assert.equal(record.coverage.metrics.lines.percent, 60);
    prepareCoverageReport(run, record);
    assert.match(readFileSync(path.join(run, 'allure-results/environment.properties'), 'utf8'), /coverage_lines=60.00%/);
    writeFileSync(path.join(run, 'coverage/detail/index.html'), 'tampered');
    assert.throws(() => prepareCoverageReport(run, record), /integrity/);
  } finally {
    // This exact directory was created by mkdtemp inside the OS temp root.
    const resolved = path.resolve(base);
    assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
    assert.ok(path.basename(resolved).startsWith('treasury-coverage-test-'));
    rmSync(resolved, { recursive: true, force: true });
  }
});

test('Historical reports do not receive current shared coverage implicitly', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'treasury-coverage-test-'));
  try {
    mkdirSync(path.join(base, 'allure-results'));
    prepareCoverageReport(base, {});
    const properties = readFileSync(path.join(base, 'allure-results/environment.properties'), 'utf8');
    assert.match(properties, /coverage_status=Not captured/);
    assert.doesNotMatch(properties, /coverage_lines=/);
  } finally {
    assert.equal(path.dirname(path.resolve(base)), path.resolve(tmpdir()));
    assert.ok(path.basename(base).startsWith('treasury-coverage-test-'));
    rmSync(base, { recursive: true, force: true });
  }
});
