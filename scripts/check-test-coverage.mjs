import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const enforce = process.argv.includes('--check');
const target = 89;
const rows = [];

function frontend(suite) {
  const file = path.join(root, `frontend/coverage/${suite}/coverage-summary.json`);
  const { total } = JSON.parse(readFileSync(file, 'utf8'));
  const metrics = Object.fromEntries(['lines', 'branches', 'functions'].map(name => {
    const metric = total[name];
    if (!metric || metric.total <= 0) throw new Error(`Empty ${name} denominator: ${file}`);
    return [name, 100 * metric.covered / metric.total];
  }));
  return { suite: `frontend ${suite}`, ...metrics, generated: statSync(file).mtime.toISOString() };
}

function backend(suite) {
  const task = `jacoco${suite[0].toUpperCase()}${suite.slice(1)}TestReport`;
  const file = path.join(root, `backend/build/reports/jacoco/${task}/${task}.xml`);
  const xml = readFileSync(file, 'utf8');
  // JaCoCo root counters follow the final package; never aggregate nested counters.
  const counters = xml.slice(xml.lastIndexOf('</package>') + '</package>'.length);
  const metrics = Object.fromEntries([['LINE', 'lines'], ['BRANCH', 'branches'], ['METHOD', 'functions']]
    .map(([counter, name]) => {
      const match = counters.match(new RegExp(`<counter type="${counter}" missed="(\\d+)" covered="(\\d+)"\\s*/>`));
      if (!match || Number(match[1]) + Number(match[2]) <= 0) {
        throw new Error(`Missing or empty ${counter} counter: ${file}`);
      }
      return [name, 100 * Number(match[2]) / (Number(match[1]) + Number(match[2]))];
    }));
  return { suite: `backend ${suite}`, ...metrics, generated: statSync(file).mtime.toISOString() };
}

let incomplete = false;
for (const [name, read] of [['frontend', frontend], ['backend', backend]]) {
  for (const suite of ['unit', 'integration']) {
    try { rows.push(read(suite)); }
    catch (error) {
      incomplete = true;
      console.error(`${name} ${suite}: ${error.message}`);
    }
  }
}
console.table(rows.map(row => ({
  suite: row.suite,
  lines: `${row.lines.toFixed(2)}%`,
  branches: `${row.branches.toFixed(2)}%`,
  'functions/methods': `${row.functions.toFixed(2)}%`,
  'target 89%': [row.lines, row.branches, row.functions].every(value => value >= target) ? 'PASS' : 'PENDING',
  'report modified (UTC)': row.generated,
})));
console.log('Report timestamps do not certify the tested commit or a successful test run.');
if (incomplete || (enforce && rows.some(row =>
  [row.lines, row.branches, row.functions].some(value => value < target)))) process.exitCode = 1;
