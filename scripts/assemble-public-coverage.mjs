import { cpSync, lstatSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep existing coverage files while excluding the private evidence added by CI.
export function copyCoverage(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (!['allure', 'receipt.json'].includes(entry.name)) {
      const input = path.join(source, entry.name);
      if (lstatSync(input).isSymbolicLink()) throw new Error('Redirected coverage input');
      if (entry.isDirectory()) copyCoverage(input, path.join(destination, entry.name));
      else cpSync(input, path.join(destination, entry.name));
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, destination] = process.argv.slice(2);
  if (process.argv.length !== 4) throw new Error('Expected evidence and public directories');
  for (const app of ['frontend', 'backend']) copyCoverage(path.join(source, app), path.join(destination, app));
}
