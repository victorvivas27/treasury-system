import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = resolve(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const relativePath = path => relative(root, path).replaceAll('\\', '/');
const sourcePaths = [
  ...walk(resolve(root, 'frontend/src')),
  ...walk(resolve(root, 'backend/src/main/java')),
  ...['index.html', 'vite.config.ts', 'public/manifest.webmanifest', 'public/service-worker.js']
    .map(path => resolve(root, 'frontend', path)),
].filter(path => /\.(tsx?|css|html|java|js|webmanifest)$/.test(path)
  && !/\.(test|spec)\./.test(path));
const sources = sourcePaths.map(path => ({ path: relativePath(path), text: readFileSync(path, 'utf8') }));
const emailImages = new Set(['icono-tesoreria.png', 'support-chat.png', 'principal_login.png', 'password-changed.png', 'password-reset.png']);
const artworkManifest = JSON.parse(readFileSync(resolve(root, 'frontend/src/shared/assets/publicImages.manifest.json'), 'utf8'));
const inventory = [
  ...walk(resolve(root, 'frontend/public')),
  ...walk(resolve(root, 'frontend/src/assets')),
].filter(path => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(path)).map(path => {
  const file = relativePath(path);
  const name = basename(path);
  let references = sources.filter(source => source.text.includes(name)
    || source.text.includes(encodeURIComponent(name))).map(source => source.path);
  let status = references.length ? 'referenced-in-production-source' : 'no-static-reference-found';
  let category = file.startsWith('frontend/src/assets/') ? 'illustrations' : 'public-images';
  const artwork = Object.entries(artworkManifest.images).find(([, image]) => image.source === file
    || file === `frontend/public/app-images/v1/${image.file}`);
  if (artwork) {
    status = artwork[1].source === file ? 'source-for-optimized-public-image' : 'public-artwork-cloud-url';
    category = 'optimized-illustrations';
    references = [`frontend/src/shared/assets/publicImages.manifest.json#images.${artwork[0]}`];
  } else if (file.includes('/avatars/')) {
    status = 'dynamic-avatar-catalog';
    category = 'avatars';
    references.push('frontend/vite.config.ts (virtual:avatar-catalog)');
  } else if (file.includes('/email/v1/') && emailImages.has(name)) {
    status = 'email-artwork-cloud-url';
    category = 'email';
    references = references.filter(path => path.endsWith('/EmailImages.java'));
  } else if (file.includes('/images/products/') || file.includes('/assets/stand/')) {
    category = 'stands';
  } else if (name === 'icono-tesoreria.png') {
    category = 'official-logo';
  }
  return { file, bytes: statSync(path).size, format: extname(path).slice(1), category, status, references };
}).sort((first, second) => second.bytes - first.bytes);

const groups = Object.groupBy(inventory, image => image.status);
const summary = Object.fromEntries(Object.entries(groups).map(([status, images]) => [status, {
  count: images.length, bytes: images.reduce((sum, image) => sum + image.bytes, 0),
}]));
const report = {
  scope: 'Static production references and dynamic avatar catalog; not a crawl of authenticated screens or database images.',
  summary,
  inventory,
  remoteImages: [
    { kind: 'Nine optimized public illustrations', source: 'frontend/src/shared/assets/publicImages.manifest.json' },
    { kind: 'Email artwork', source: 'backend/src/main/java/com/tesoreria/user/infrastructure/adapter/out/email/EmailImages.java' },
    { kind: 'Mercado Pago logo on jsDelivr', source: 'frontend/src/presentation/pages/tesoreria/PaymentsPage.tsx' },
    { kind: 'User uploads and course photos through authenticated backend endpoints', source: 'frontend/src/core/C-infra/repositories' },
  ],
};
const output = resolve(root, 'frontend/demo-output/image-assets');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
writeFileSync(resolve(output, 'inventory.csv'), '\uFEFF' + [
  ['file', 'bytes', 'category', 'status', 'references'].map(quote).join(','),
  ...inventory.map(image => [image.file, image.bytes, image.category, image.status, image.references.join(' | ')].map(quote).join(',')),
].join('\n') + '\n');
console.log(JSON.stringify({ summary, largestReferenced: inventory.filter(image =>
  !['no-static-reference-found', 'source-for-optimized-public-image'].includes(image.status)).slice(0, 14), output: relativePath(output) }, null, 2));
