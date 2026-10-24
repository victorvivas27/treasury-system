import path from 'node:path';
import { existsSync } from 'node:fs';
import { defineConfig } from 'allure';
import { coverageAttachments } from '../scripts/allure-coverage.mjs';

const runDir = process.env.TREASURY_ALLURE_RUN_DIR;
const reportToOpen = process.argv[3];
const suite = runDir ? path.basename(path.dirname(runDir)) : undefined;
if (suite && !['unit', 'integration', 'combined'].includes(suite)) {
  throw new Error('Allure requires a unit or integration run');
}
const reportName = suite ? `Frontend ${suite}` : 'Frontend';
if (!runDir && (!['open', 'serve'].includes(process.argv[2]) || !reportToOpen ||
  !existsSync(path.resolve(reportToOpen, 'index.html')) ||
  !existsSync(path.resolve(reportToOpen, 'summary.json')))) {
  throw new Error('Use test:allure:unit, allure:generate, or open <existing-report-directory>');
}

export default defineConfig({
  name: `Treasury System — ${reportName}`,
  output: runDir ? path.join(runDir, 'allure-report') : path.resolve(reportToOpen),
  globalAttachments: coverageAttachments(runDir, process.cwd()),
  plugins: {
    // Avoid the directory renames used by the multi-file report on synced folders.
    awesome: { options: { reportName, singleFile: true, open: false, publish: false } },
  },
});
