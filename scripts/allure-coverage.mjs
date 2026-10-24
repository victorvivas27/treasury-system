import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function metric(covered, total) {
  if (!Number.isSafeInteger(covered) || !Number.isSafeInteger(total) || total <= 0 || covered < 0 || covered > total) {
    throw new Error('Invalid or empty coverage denominator');
  }
  return { covered, total, percent: Number((100 * covered / total).toFixed(2)) };
}

export function parseCoverage(content, application) {
  if (application === 'frontend') {
    const { total } = JSON.parse(content);
    return Object.fromEntries(['lines', 'branches', 'functions'].map((name) =>
      [name, metric(total?.[name]?.covered, total?.[name]?.total)]));
  }
  // JaCoCo repeats counters inside classes/packages. Only report-root counters count.
  const counters = content.slice(content.lastIndexOf('</package>') + '</package>'.length);
  if (!content.includes('</package>') || !counters.includes('</report>')) throw new Error('Incomplete JaCoCo XML');
  return Object.fromEntries([['LINE', 'lines'], ['BRANCH', 'branches'], ['METHOD', 'methods']].map(([type, name]) => {
    const tag = counters.match(new RegExp(`<counter\\b[^>]*\\btype="${type}"[^>]*/>`))?.[0];
    const covered = Number(tag?.match(/\bcovered="(\d+)"/)?.[1]);
    const missed = Number(tag?.match(/\bmissed="(\d+)"/)?.[1]);
    return [name, metric(covered, covered + missed)];
  }));
}

function filesUnder(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    const file = path.join(dir, entry.name);
    if (lstatSync(file).isSymbolicLink()) throw new Error('Coverage snapshots cannot contain symbolic links');
    return entry.isDirectory() ? filesUnder(file, relative) : [relative];
  }).sort();
}

export function captureCoverage(runDir, record, sourceDir, sourceFile, application) {
  try {
    if (record.runnerExitCode !== 0) throw new Error('Runner failed; coverage is not certified');
    if (statSync(path.join(sourceDir, sourceFile)).mtimeMs < Date.parse(record.startedAt)) {
      throw new Error('Coverage predates this execution');
    }
    filesUnder(sourceDir); // Reject redirected input before copying anything.
    const metrics = parseCoverage(readFileSync(path.join(sourceDir, sourceFile), 'utf8'), application);
    const dir = path.join(runDir, 'coverage');
    mkdirSync(dir); // Each snapshot is captured once, immediately after its runner.
    cpSync(sourceDir, path.join(dir, 'detail'), { recursive: true, errorOnExist: true, force: false });
    const summary = {
      application, suite: record.suite, scope: record.scope, runId: record.runId,
      sha: record.sha, dirty: record.dirty, startedAt: record.startedAt,
      capturedAt: new Date().toISOString(), tool: application === 'frontend' ? 'Vitest V8' : 'JaCoCo',
      denominator: application === 'frontend'
        ? 'TypeScript ejecutable de frontend/src, con include/exclude vigentes de vite.config.ts.'
        : record.suite === 'combined'
          ? 'Clases del reporte histórico jacocoTestReport, con sus exclusiones vigentes de build.gradle.'
          : 'Clases principales backend, excluyendo arranque y *MapperImpl en los reportes separados.',
      configurationHash: record.coverageConfigurationHash,
      metrics,
    };
    writeJson(path.join(dir, 'coverage-summary.json'), summary);
    const labels = { lines: 'Líneas', branches: 'Ramas', functions: 'Funciones', methods: 'Métodos' };
    const markdown = `# Cobertura de código — ${application} ${record.suite}\n\n` +
      `Alcance de ejecución: **${record.scope}**. Motor: ${summary.tool}.\n\n` +
      '| Métrica | Cobertura | Cubiertas / incluidas |\n|---|---:|---:|\n' +
      Object.entries(metrics).map(([name, value]) => `| ${labels[name]} | ${value.percent.toFixed(2)} % | ${value.covered} / ${value.total} |`).join('\n') +
      `\n\nDenominador: ${summary.denominator}\n\nCorrida: ${record.runId}\n\nSHA: ${record.sha}; cambios locales: ${record.dirty}.\n\n` +
      'Este porcentaje mide código ejecutado por esta suite; no es porcentaje de pruebas aprobadas ni de funcionalidades verificadas. ' +
      'Las suites se superponen: no sumar ni promediar estos porcentajes. No se calcula una cobertura global frontend + backend.\n\n' +
      (application === 'frontend' && record.suite === 'integration' ? 'El transporte HTTP es simulado; no se acredita conexión a backend real.\n\n' : '') +
      'El archivo coverage-detail.zip contiene los reportes originales. Descomprimir y abrir el index.html del detalle.\n';
    writeFileSync(path.join(dir, 'cobertura.md'), markdown);
    // adm-zip is a declared dependency of the pinned Allure CLI (no extra install).
    const requireAllure = createRequire(realpathSync(path.join(root, 'frontend/node_modules/allure/package.json')));
    const Zip = requireAllure('adm-zip');
    const archive = new Zip();
    archive.addLocalFolder(path.join(dir, 'detail'), 'coverage');
    archive.addFile('coverage-summary.json', Buffer.from(JSON.stringify(summary, null, 2)));
    archive.addFile('LEEME.md', Buffer.from(markdown));
    archive.writeZip(path.join(dir, 'coverage-detail.zip'));
    const manifest = filesUnder(dir).map((file) => ({ file, sha256: hash(path.join(dir, file)) }));
    writeJson(path.join(dir, 'manifest.json'), manifest);
    record.coverage = { status: 'available', ...summary, manifestSha256: hash(path.join(dir, 'manifest.json')) };
  } catch (error) {
    record.coverage = { status: 'unavailable', reason: error.message };
  }
}

export function configurationHash(file) { return hash(file); }

export function prepareCoverageReport(runDir, record) {
  if (record.coverage?.status === 'available') {
    const dir = path.join(runDir, 'coverage');
    const manifestFile = path.join(dir, 'manifest.json');
    if (hash(manifestFile) !== record.coverage.manifestSha256) throw new Error('Coverage manifest integrity failure');
    for (const entry of readJson(manifestFile)) {
      const file = path.resolve(dir, entry.file);
      if (!file.startsWith(path.resolve(dir) + path.sep) || hash(file) !== entry.sha256) {
        throw new Error('Coverage snapshot integrity failure');
      }
    }
  }
  const coverage = record.coverage;
  const fields = coverage?.status === 'available'
    ? Object.fromEntries(Object.entries(coverage.metrics).map(([name, value]) =>
      [`coverage_${name}`, `${value.percent.toFixed(2)}% (${value.covered}/${value.total})`]))
    : { coverage_status: coverage?.reason ?? 'Not captured in this historical run; do not reuse current shared reports' };
  if (coverage?.status === 'available') {
    fields.coverage_scope = `${coverage.application} ${record.suite}; ${record.scope}`;
    fields.coverage_denominator = coverage.denominator;
  }
  const propertiesFile = path.join(runDir, 'allure-results/environment.properties');
  const existing = existsSync(propertiesFile) ? readFileSync(propertiesFile, 'utf8') : '';
  const original = existing.replace(/# treasury-coverage:start[\s\S]*?# treasury-coverage:end\r?\n?/g, '');
  const block = '# treasury-coverage:start\n' + Object.entries(fields)
    .map(([name, value]) => `${name}=${String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n')}`).join('\n') +
    '\n# treasury-coverage:end\n';
  writeFileSync(propertiesFile, block + original);
}

export function coverageAttachments(runDir, cwd) {
  if (!runDir || !existsSync(path.join(runDir, 'coverage/manifest.json'))) return [];
  return ['cobertura.md', 'coverage-summary.json', 'coverage-detail.zip']
    .map((file) => path.relative(cwd, path.join(runDir, 'coverage', file)).split(path.sep).join('/'));
}
