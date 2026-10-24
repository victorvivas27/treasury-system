import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareCoverageReport } from './allure-coverage.mjs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const root = fileURLToPath(new URL('../', import.meta.url));

export function addReport(run, output, { id, releaseSha, fingerprint, workflowRunId }) {
  const record = read(path.join(run, 'run.json'));
  if (!/^[a-zA-Z0-9-]{1,140}$/.test(id) || !/^[a-f0-9]{40}$/.test(record.sha) ||
      !['frontend', 'backend'].includes(record.application) || !['unit', 'integration', 'combined'].includes(record.suite) ||
      record.scope !== 'complete' || record.exitCode !== 0 || record.runnerExitCode !== 0 ||
      !record.counts?.matches || !record.counts?.reportMatches || !record.counts.runner.total ||
      record.counts.runner.failed || record.counts.runner.skipped || record.counts.runner.todo ||
      record.coverage?.status !== 'available') throw new Error('Report is not complete validated evidence');
  prepareCoverageReport(run, record); // Verify snapshot hashes before publication.
  const html = path.join(run, 'allure-report/index.html');
  if (statSync(html).size > 30_000_000) throw new Error('Report exceeds the authenticated API size limit');
  const stats = read(path.join(run, 'allure-report/summary.json')).stats;
  if (stats.total !== record.counts.runner.total || stats.passed !== stats.total) throw new Error('HTML summary mismatch');
  const report = { id, application: record.application, suite: record.suite, generatedAt: record.finishedAt,
    sha: record.sha, releaseSha, fingerprint, workflowRunId, sha256: hash(html),
    tests: record.counts.runner, coverage: record.coverage.metrics };
  const destination = path.join(output, 'reports', id);
  mkdirSync(destination, { recursive: true });
  const target = path.join(destination, 'index.html');
  if (existsSync(target) && hash(target) !== report.sha256) throw new Error('Immutable report ID already exists');
  cpSync(html, target);
  return report;
}

export function assemble(inputs, output, context) {
  if (!/^[a-f0-9]{40}$/.test(context.releaseSha)) throw new Error('Expected exact release SHA');
  const reports = [];
  for (const application of ['frontend', 'backend']) {
    const input = inputs[application];
    const receipt = read(path.join(input, 'receipt.json'));
    const record = read(path.join(input, 'allure/run.json'));
    if (receipt.schema !== 1 || receipt.valid !== true || receipt.application !== application ||
        receipt.suite !== 'combined' || record.suite !== 'combined' || record.dirty ||
        !/^[a-f0-9]{64}$/.test(context.fingerprints[application]) ||
        receipt.fingerprint !== context.fingerprints[application] || receipt.sha !== context.sourceShas[application] ||
        receipt.sha !== record.sha || receipt.runId !== record.runId ||
        String(receipt.workflowRunId) !== String(context.workflowRuns[application])) throw new Error(`Unattributed ${application} evidence`);
    reports.push(addReport(path.join(input, 'allure'), output, {
      id: `${context.publicationId}-${application}`, releaseSha: context.releaseSha,
      fingerprint: receipt.fingerprint, workflowRunId: String(receipt.workflowRunId),
    }));
  }
  const previous = context.previous?.reports ?? [];
  if (!Array.isArray(previous) || previous.some(report => !/^[a-zA-Z0-9-]{1,140}$/.test(report.id ?? ''))) throw new Error('Invalid previous catalog');
  const ids = new Set(reports.map(report => report.id));
  const catalog = { configured: true, reports: [...reports, ...previous.filter(report => !ids.has(report.id))].slice(0, 200) };
  writeFileSync(path.join(output, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  return catalog;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, ...args] = process.argv.slice(2);
    if (mode === 'local') {
      const [application, suite, id, destination] = args;
      if (args.length !== 4 || !['frontend', 'backend'].includes(application) ||
          !['unit', 'integration', 'combined'].includes(suite) || !/^[\w-]+$/.test(id)) throw new Error('local <application> <suite> <run-id> <output>');
      const output = path.resolve(destination);
      const run = path.join(root, application, 'build/allure', suite, id);
      const record = read(path.join(run, 'run.json'));
      const report = addReport(run, output, { id: `local-${application}-${id}`, releaseSha: record.sha, fingerprint: 'local', workflowRunId: 'local' });
      const catalogFile = path.join(output, 'catalog.json');
      const previous = existsSync(catalogFile) ? read(catalogFile).reports : [];
      writeFileSync(catalogFile, JSON.stringify({ configured: true, reports: [report, ...previous.filter(item => item.id !== report.id)].slice(0, 200) }, null, 2) + '\n');
    } else if (mode === 'ci' && args.length === 3) {
      assemble({ frontend: path.resolve(args[0]), backend: path.resolve(args[1]) }, path.resolve(args[2]), {
        releaseSha: process.env.RELEASE_SHA, publicationId: `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`,
        fingerprints: { frontend: process.env.FRONTEND_KEY, backend: process.env.BACKEND_KEY },
        sourceShas: { frontend: process.env.FRONTEND_SHA, backend: process.env.BACKEND_SHA },
        workflowRuns: { frontend: process.env.FRONTEND_RUN, backend: process.env.BACKEND_RUN },
        previous: existsSync('previous-catalog.json') ? read('previous-catalog.json') : undefined,
      });
    } else throw new Error('Expected ci <frontend-evidence> <backend-evidence> <output> or local <application> <suite> <run-id> <output>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
