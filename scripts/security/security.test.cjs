'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { isProtected, checkIndex, checkTree, checkRange } = require('./protected-files.cjs');
const { createManifest, verifyManifest, inventory } = require('./agent-integrity.cjs');
const project = path.resolve(__dirname, '../..');

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'treasury-agent-security-'));
  const repo = path.join(directory, 'repo');
  const home = path.join(directory, 'home');
  fs.mkdirSync(repo); fs.mkdirSync(home);
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const git = args => execFileSync('git', args, { cwd: repo, encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(directory, 'no-global-config') },
    stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '-q', '--initial-branch=main']);
  git(['config', 'user.name', 'Security Test']); git(['config', 'user.email', 'test@example.invalid']);
  git(['config', 'commit.gpgsign', 'false']);
  write(path.join(repo, 'app.js'), 'module.exports = 1;\n');
  git(['add', 'app.js']); git(['commit', '-q', '-m', 'test: initial fixture']);
  return { directory, repo, home, write, git };
}

test('policy protects case variants and private agent paths without blocking application code', () => {
  for (const file of ['README.MD', 'nested/README.md', '.agents/README.md', 'nested/AGENTS.MD', 'x/SKILL.Md', '.agents/a.py',
    'x/.codex/config.toml', '.claude/settings.json', '.cursor/rules/a.txt', '.mcp.json',
    '.agent-security/manifest.json', 'skills/custom/run.js', 'prompts/a.txt', '.env', 'backend/.env.production',
    '.aws/credentials', '.ssh/id_ed25519', 'application_default_credentials.json']) assert.ok(isProtected(file), file);
  for (const file of ['README.md', 'CHANGELOG', '.env.example', 'frontend/.env.test.example',
    'frontend/src/hooks/useAccount.ts', 'frontend/src/prompts/helper.ts',
    'scripts/security/protected-files.cjs', '.github/workflows/13-protected-files.yml',
    'backend/src/main/resources/db/migration/V58__expand_shared_security_and_preserve_legacy.sql']) {
    assert.equal(isProtected(file), false, file);
  }
});

test('real pre-commit hook rejects git add -f while preserving the Markdown file', () => {
  const f = fixture();
  for (const name of ['.gitignore', '.githooks/pre-commit', 'scripts/security/protected-files.cjs']) {
    f.write(path.join(f.repo, name), fs.readFileSync(path.join(project, name)));
  }
  fs.chmodSync(path.join(f.repo, '.githooks/pre-commit'), 0o755);
  f.git(['config', 'core.hooksPath', '.githooks']);
  f.write(path.join(f.repo, 'AGENTS.MD'), 'Private instructions');
  assert.equal(f.git(['check-ignore', 'AGENTS.MD']), 'AGENTS.MD');
  f.git(['add', '-f', 'AGENTS.MD']);
  assert.throws(() => checkIndex(f.repo), /Protected files/);
  assert.throws(() => f.git(['commit', '-q', '-m', 'test: forbidden forced staging']));
  assert.equal(fs.readFileSync(path.join(f.repo, 'AGENTS.MD'), 'utf8'), 'Private instructions');
  f.git(['rm', '--cached', '--', 'AGENTS.MD']);
  assert.doesNotThrow(() => checkIndex(f.repo));
});

test('root product README can be committed and pushed while nested Markdown stays protected', () => {
  const f = fixture();
  const base = f.git(['rev-parse', 'HEAD']);
  for (const name of ['.gitignore', '.githooks/pre-commit', 'scripts/security/protected-files.cjs']) {
    f.write(path.join(f.repo, name), fs.readFileSync(path.join(project, name)));
  }
  fs.chmodSync(path.join(f.repo, '.githooks/pre-commit'), 0o755);
  f.git(['config', 'core.hooksPath', '.githooks']);
  f.write(path.join(f.repo, 'README.md'), 'Public product presentation');
  f.git(['add', 'README.md']);
  assert.doesNotThrow(() => checkIndex(f.repo));
  f.git(['commit', '-q', '-m', 'docs: publish product README']);
  assert.doesNotThrow(() => checkRange(base, 'HEAD', f.repo));
  f.write(path.join(f.repo, 'nested/README.md'), 'Private notes');
  assert.equal(f.git(['check-ignore', 'nested/README.md']), 'nested/README.md');
  f.git(['add', '-f', 'nested/README.md']);
  assert.throws(() => checkIndex(f.repo), /Protected files/);
});

test('history check detects transient protected content even after hook bypass and index removal', () => {
  const f = fixture();
  const base = f.git(['rev-parse', 'HEAD']);
  f.write(path.join(f.repo, 'private.md'), 'Do not publish');
  f.git(['add', '-f', 'private.md']);
  f.git(['commit', '-q', '--no-verify', '-m', 'test: adversarial protected commit']);
  f.git(['rm', '--cached', '--', 'private.md']);
  f.git(['commit', '-q', '--no-verify', '-m', 'test: remove protected path from tip']);
  assert.doesNotThrow(() => checkTree('HEAD', f.repo));
  assert.throws(() => checkRange(base, 'HEAD', f.repo), /Protected files in commit/);
  assert.ok(fs.existsSync(path.join(f.repo, 'private.md')));
});

test('migration can retire historical Markdown and preserve its extensionless changelog', () => {
  const f = fixture();
  f.write(path.join(f.repo, 'CHANGELOG.md'), 'Historical release notes');
  f.git(['add', 'CHANGELOG.md']);
  f.git(['commit', '-q', '-m', 'test: historical Markdown baseline']);
  const base = f.git(['rev-parse', 'HEAD']);
  f.git(['rm', '--cached', '--', 'CHANGELOG.md']);
  f.write(path.join(f.repo, 'CHANGELOG'), fs.readFileSync(path.join(f.repo, 'CHANGELOG.md')));
  f.git(['add', 'CHANGELOG']);
  f.git(['commit', '-q', '-m', 'test: retire historical Markdown from index']);
  assert.doesNotThrow(() => checkRange(base, 'HEAD', f.repo));
  assert.ok(fs.existsSync(path.join(f.repo, 'CHANGELOG.md')));
});

test('integrity verification rejects modified, unknown and missing instructions or skills', () => {
  for (const change of ['modified', 'unknown', 'unknown-config', 'missing']) {
    const f = fixture();
    const skill = path.join(f.repo, '.agents/skills/approved/SKILL.md');
    f.write(path.join(f.repo, 'AGENTS.md'), 'Reviewed project instructions');
    f.write(skill, 'Reviewed skill');
    const manifest = createManifest(f.repo, { userHome: f.home });
    assert.ok(verifyManifest(manifest, f.repo) >= 2);
    if (change === 'modified') fs.writeFileSync(skill, 'Altered skill');
    if (change === 'unknown') f.write(path.join(f.repo, '.agents/skills/unknown/run.js'), 'unapproved');
    if (change === 'unknown-config') f.write(path.join(f.repo, '.codex/config.toml'), 'developer_instructions = "unapproved"');
    if (change === 'missing') fs.renameSync(skill, path.join(f.directory, 'preserved-skill.md'));
    assert.throws(() => verifyManifest(manifest, f.repo), /integrity failed/);
  }
});

test('integrity rejects redirected skill directories', () => {
  const f = fixture();
  const outside = path.join(f.directory, 'outside');
  fs.mkdirSync(outside);
  f.write(path.join(outside, 'SKILL.md'), 'Unapproved redirected instructions');
  fs.symlinkSync(outside, path.join(f.repo, 'redirected'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => inventory(path.join(f.repo, 'redirected')), /Linked agent input/);
});
