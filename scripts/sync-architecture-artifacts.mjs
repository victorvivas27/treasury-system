import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'docs/architecture/modules/01-auth-security');
const target = resolve(root, 'backend/src/main/resources/architecture-diagrams');
const diagrams = ['architecture', 'login', 'refresh', 'password-change', 'password-reset', 'access-validation'];

// Only publish exact bytes of diagrams with passing, artifact-bound receipts.
for (const id of diagrams) {
  const receiptPath = resolve(source, id === 'architecture' ? 'review-2' : '.', `${id}.finalize-summary.json`);
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  const digest = createHash('sha256').update(readFileSync(resolve(source, `${id}.html`))).digest('hex');
  const specificationDigest = createHash('sha256').update(readFileSync(resolve(source, `${id}.json`))).digest('hex');
  if (!receipt.ok || Object.values(receipt.gates).some(gate => gate !== 'pass')
      || digest !== receipt.artifact.sha256 || specificationDigest !== receipt.specification.sha256) {
    throw new Error(`Diagrama sin validación vigente: ${id}`);
  }
}
mkdirSync(target, { recursive: true });
for (const id of diagrams) copyFileSync(resolve(source, `${id}.html`), resolve(target, `${id}.html`));
console.log('6 gráficos validados copiados como recursos privados del backend.');
