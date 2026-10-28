import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'frontend/src/shared/assets/publicImages.manifest.json'), 'utf8'));
const checks = await Promise.allSettled(Object.entries(manifest.images).map(async ([name, image]) => {
  const url = `${manifest.baseUrl}/${image.file}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${name}: public HTTP response`);
  assert.match(response.headers.get('content-type') ?? '', /^image\/webp(?:;|$)/, `${name}: content type`);
  const cacheControl = response.headers.get('cache-control') ?? '';
  assert.match(cacheControl, /max-age=31536000/, `${name}: cache lifetime`);
  assert.match(cacheControl, /immutable/, `${name}: versioned cache`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.length, image.bytes, `${name}: file size`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), image.sha256, `${name}: exact uploaded bytes`);
  return { name, url, bytes: bytes.length, cacheControl, verified: true };
}));
const verified = [];
for (const check of checks) {
  if (check.status === 'fulfilled') {
    verified.push(check.value);
    console.log(`${check.value.name}: public, correct SHA-256, ${check.value.bytes} bytes, one-year immutable cache`);
  } else {
    console.error(check.reason);
    process.exitCode = 1;
  }
}
const output = resolve(root, 'frontend/demo-output/image-assets');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'cloud-verification.json'), JSON.stringify({
  verifiedAt: new Date().toISOString(), expected: Object.keys(manifest.images).length, verified,
}, null, 2) + '\n');
