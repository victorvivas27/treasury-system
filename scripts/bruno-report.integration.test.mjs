import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { allureRequests } from './bruno-coverage.mjs';

test('real Allure CLI renders converted Bruno requests with matching totals', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'treasury-bruno-report-'));
  try {
    const results = path.join(directory, 'results');
    const output = path.join(directory, 'html');
    mkdirSync(results);
    const requests = ['passed', 'failed', 'skipped'].map(status => ({ status, method: 'GET', operation: '/api/v1/example', checks: 1, statusCode: 200 }));
    for (const result of allureRequests(requests)) writeFileSync(path.join(results, `${result.uuid}-result.json`), JSON.stringify(result));
    const config = path.join(directory, 'allurerc.json');
    writeFileSync(config, JSON.stringify({ name: 'Bruno adapter validation', output,
      plugins: { awesome: { options: { singleFile: true, open: false, publish: false } } } }));
    const cli = fileURLToPath(new URL('../frontend/node_modules/allure/cli.js', import.meta.url));
    const generated = spawnSync(process.execPath, [cli, 'generate', results, '--config', config], { encoding: 'utf8', timeout: 60_000 });
    assert.equal(generated.status, 0, generated.stderr || generated.error?.message);
    const { stats } = JSON.parse(readFileSync(path.join(output, 'summary.json'), 'utf8'));
    assert.equal(stats.total, 3);
    assert.equal(stats.passed, 1);
    assert.equal(stats.failed, 1);
    assert.equal(stats.skipped, 1);
    assert.ok(readFileSync(path.join(output, 'index.html'), 'utf8').includes('<html'));
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('treasury-bruno-report-'));
    rmSync(directory, { recursive: true, force: true });
  }
});
