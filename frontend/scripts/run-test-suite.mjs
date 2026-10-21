import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [suite, ...args] = process.argv.slice(2);
if (!['unit', 'integration'].includes(suite)) {
  throw new Error('Expected unit or integration suite');
}
const cli = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));
const result = spawnSync(process.execPath, [cli, 'run', ...args], {
  stdio: 'inherit',
  env: { ...process.env, TEST_SUITE: suite },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
