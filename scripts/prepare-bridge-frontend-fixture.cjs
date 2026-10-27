const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
// Immutable source associated with the verified v1.34.0 production images.
const commit = '13be0ba72053804fe4d881a8dc29c38e21bb55a3';
const source = execFileSync('git', ['show', `${commit}:frontend/src/presentation/pages/auth/AccountFlowPages.tsx`], {
  cwd: path.join(__dirname, '..'), encoding: 'utf8',
}).replaceAll('"./passwordRecoveryValidation"', '"@/presentation/pages/auth/passwordRecoveryValidation"')
  .replaceAll('"./AccountFlowPages.css"', '"@/presentation/pages/auth/AccountFlowPages.css"')
  .replaceAll('"./LoginPage.css"', '"@/presentation/pages/auth/LoginPage.css"');
const directory = path.join(__dirname, '../frontend/build/bridge-fixtures');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'AccountFlowPages.v1.34.0.tsx'), source);
console.log(`Prepared production frontend component fixture from ${commit}; only import paths adjusted.`);
