import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const authSource = resolve(root, 'docs/architecture/modules/01-auth-security');
const operationsSource = resolve(root, 'docs/architecture/modules/12-shared-infrastructure/github-actions');
const target = resolve(root, 'backend/src/main/resources/architecture-diagrams');
const auth = ['architecture', 'login', 'refresh', 'password-change', 'password-reset', 'access-validation'];
const operations = ['ci-cd-workflows', 'ci-cd-dev-pr', 'ci-cd-release', 'ci-cd-evidence', 'ci-cd-delivery', 'ci-cd-sync'];
const diagrams = [
  ...(process.argv.includes('--operations-only') ? [] : auth.map(id => ({ id, source: authSource,
    receipts: resolve(authSource, 'review-2026-11-17') }))),
  ...(process.argv.includes('--auth-only') ? [] : operations.map(id => ({ id, source: operationsSource, receipts: resolve(operationsSource, 'review-3.2.0') }))),
];
if (process.argv.includes('--auth-only') && process.argv.includes('--operations-only')) {
  throw new Error('Seleccionar --auth-only o --operations-only, no ambos.');
}

// Validate every selected artifact before copying any bytes into the private resources.
for (const { id, source, receipts } of diagrams) {
  const receipt = JSON.parse(readFileSync(resolve(receipts, `${id}.finalize-summary.json`), 'utf8'));
  const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  if (receipt.ok !== true || receipt.quality !== 'showcase'
      || ['validate', 'deliver', 'check', 'browser-check'].some(gate => receipt.gates?.[gate] !== 'pass')
      || digest(resolve(source, `${id}.html`)) !== receipt.artifact?.sha256
      || digest(resolve(source, `${id}.json`)) !== receipt.specification?.sha256) {
    throw new Error(`Diagrama sin validacion Archify vigente: ${id}`);
  }
}
mkdirSync(target, { recursive: true });
for (const { id, source } of diagrams) copyFileSync(resolve(source, `${id}.html`), resolve(target, `${id}.html`));
console.log(`${diagrams.length} graficos Archify validados copiados como recursos privados del backend.`);
