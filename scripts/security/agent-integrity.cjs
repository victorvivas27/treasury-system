'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');

function inventory(root) {
  if (!fs.existsSync(root)) return null;
  const files = {};
  function visit(file, relative) {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error(`Linked agent input is forbidden: ${file}`);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) visit(path.join(file, name), relative ? `${relative}/${name}` : name);
    } else if (stat.isFile()) {
      files[relative || '.'] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    } else throw new Error(`Unsupported agent input: ${file}`);
  }
  visit(root, '');
  return files;
}

function createManifest(repository, { userHome = os.homedir(), codexHome = path.join(userHome, '.codex') } = {}) {
  const repo = fs.realpathSync(repository);
  const roots = [
    ['project-instructions', path.join(repo, 'AGENTS.md')],
    ['project-agents', path.join(repo, '.agents')],
    ['user-instructions', path.join(codexHome, 'AGENTS.md')],
    ['user-skills', path.join(userHome, '.agents/skills')],
    ['system-skills', path.join(codexHome, 'skills')],
    ['plugins', path.join(codexHome, 'plugins/cache')],
    ['rules', path.join(codexHome, 'rules')],
    ['agent-config', path.join(codexHome, 'config.toml')],
    ['publication-hooks', path.join(repo, '.githooks')],
    ['security-controls', path.join(repo, 'scripts/security')],
    ['publication-policy', path.join(repo, '.gitignore')],
    ['ci-controls', path.join(repo, '.github')],
    ['commit-policy', path.join(repo, 'scripts/validate-commit-message.cjs')],
    ['validation-policy', path.join(repo, 'scripts/ci-validation.cjs')],
    ['release-evidence-policy', path.join(repo, 'scripts/validate-release-evidence.mjs')],
    ['coverage-policy', path.join(repo, 'scripts/allure-ci.mjs')],
  ];
  for (const name of ['.codex', '.claude', '.cursor', '.gemini', '.windsurf', '.cline', '.roo',
    '.continue', '.opencode', '.clinerules', '.ai', '.skills', '.prompts', '.mcp.json',
    'mcp.json', '.cursorrules', '.windsurfrules', '.aider.conf.yml', '.aider.conf.yaml',
    'skills', 'prompts', 'agent-config']) roots.push([`project-config:${name}`, path.join(repo, name)]);
  const sources = roots.map(([name, source]) => ({ name, path: path.resolve(source), files: inventory(source) }));
  return { schema: 1, repository: repo, createdAt: new Date().toISOString(), roots: sources };
}

function verifyManifest(manifest, repository) {
  if (manifest.schema !== 1 || fs.realpathSync(repository) !== manifest.repository ||
      !Array.isArray(manifest.roots) || manifest.roots.length < 12) throw new Error('Invalid agent trust manifest');
  const names = new Set();
  for (const root of manifest.roots) {
    if (!root.name || names.has(root.name) || !path.isAbsolute(root.path)) throw new Error('Invalid trust root');
    names.add(root.name);
    const actual = inventory(root.path);
    if (JSON.stringify(actual) !== JSON.stringify(root.files)) {
      throw new Error(`Agent integrity failed: ${root.name}. Changed, missing or unauthorized files; administrator approval required.`);
    }
  }
  return manifest.roots.reduce((count, root) => count + Object.keys(root.files ?? {}).length, 0);
}

if (require.main === module) {
  try {
    const [mode, repository, manifestFile] = process.argv.slice(2);
    if (!repository || !manifestFile || process.argv.length !== 5) throw new Error('Use --create REPOSITORY MANIFEST or --verify REPOSITORY MANIFEST');
    if (mode === '--create') {
      fs.writeFileSync(manifestFile, JSON.stringify(createManifest(repository), null, 2) + '\n', { flag: 'wx' });
      console.log('Created candidate manifest; administrator-owned installation is required for enforcement');
    } else if (mode === '--verify') {
      const count = verifyManifest(JSON.parse(fs.readFileSync(manifestFile, 'utf8')), repository);
      console.log(`Verified ${count} agent/control files against the selected manifest`);
    } else throw new Error('Unknown integrity command');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { inventory, createManifest, verifyManifest };
