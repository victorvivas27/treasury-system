'use strict';
const { execFileSync } = require('node:child_process');

// The root product README is public; all other Markdown remains protected.
// History before this migration remains untouched. New-branch pushes must still
// inspect every new commit since this published baseline, not only their tip.
const migrationBase = '10f5e571f0c646f3a61938cd6239e74156b01f55';
const privateDirectories = new Set(['.agents', '.codex', '.claude', '.cursor', '.gemini',
  '.windsurf', '.clinerules', '.cline', '.roo', '.continue', '.opencode',
  '.ai', '.skills', '.prompts', '.agent-security', '.aws', '.ssh', '.gnupg']);
const privateFiles = new Set(['.mcp.json', '.cursorrules', '.windsurfrules', '.aider.conf.yml', '.aider.conf.yaml',
  '.netrc', 'application_default_credentials.json']);

function isProtected(file) {
  const normalized = file.replaceAll('\\', '/').toLowerCase();
  const parts = normalized.split('/');
  const name = parts.at(-1);
  return (/\.md$/.test(normalized) && file !== 'README.md') || parts.some(part => privateDirectories.has(part)) ||
    ((name === '.env' || name.startsWith('.env.')) && !name.endsWith('.example')) ||
    /^(?:.*service-account.*|google-credentials.*)\.json$/.test(name) ||
    privateFiles.has(name) || ['mcp.json', '.vscode/mcp.json'].includes(normalized) ||
    ['skills', 'prompts', 'agent-config'].includes(parts[0]);
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}
function paths(output) { return output.split('\0').filter(Boolean); }
function reject(files, location) {
  const protectedFiles = files.filter(isProtected);
  if (protectedFiles.length) throw new Error(`Protected files in ${location}:\n${protectedFiles.map(file => JSON.stringify(file)).join('\n')}`);
}
function resolveCommit(ref, cwd) {
  return git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], cwd).trim();
}
function checkIndex(cwd) {
  reject(paths(git(['ls-files', '-z', '--cached'], cwd)), 'Git index');
}
function checkTree(ref, cwd) {
  const sha = resolveCommit(ref, cwd);
  reject(paths(git(['ls-tree', '-rz', '--name-only', '--full-tree', sha], cwd)), `tree ${sha}`);
}
function checkRange(base, head, cwd) {
  const tip = resolveCommit(head, cwd);
  const start = resolveCommit(!base || /^0+$/.test(base) ? migrationBase : base, cwd);
  checkTree(tip, cwd);
  // Inspect additions/modifications in every commit, including files removed
  // again before the final tree. Merge commits are compared to each parent.
  const commits = git(['rev-list', tip, `^${start}`], cwd).trim().split(/\r?\n/).filter(Boolean);
  for (const commit of commits) {
    reject(paths(git(['diff-tree', '--root', '-m', '--no-commit-id', '-r', '--name-only',
      '--diff-filter=ACMRT', '-z', commit], cwd)), `commit ${commit}`);
  }
}

if (require.main === module) {
  try {
    const [mode, ...args] = process.argv.slice(2);
    if (mode === '--index' && !args.length) checkIndex();
    else if (mode === '--tree' && args.length === 1) checkTree(args[0]);
    else if (mode === '--range' && args.length === 2) checkRange(args[0], args[1]);
    else throw new Error('Use --index, --tree REF, or --range BASE HEAD');
    console.log('Protected-file publication check passed');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { isProtected, checkIndex, checkTree, checkRange, migrationBase };
