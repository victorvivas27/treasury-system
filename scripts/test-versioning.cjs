// Tooling is installed in a temporary directory; the application needs no new dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const tool = createRequire(path.join(process.env.RELEASE_TOOLS_DIR, 'package.json'));
tool('release-please'); // Initialize the public entry point before loading strategies.
const { Simple } = tool('release-please/build/src/strategies/simple');
const { parseConventionalCommits } = tool('release-please/build/src/commit');
const { TagName } = tool('release-please/build/src/util/tag-name');
const Ajv = tool('ajv');
const yaml = tool('yaml');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const config = JSON.parse(read('release-please-config.json'));
const schema = tool('release-please/schemas/config.json');
const ajv = new Ajv({ strict: false, validateFormats: false });
assert.ok(ajv.validate(schema, config), JSON.stringify(ajv.errors));
for (const file of fs.readdirSync(path.join(root, '.github/workflows'))) {
  const document = yaml.parseDocument(read(`.github/workflows/${file}`), { uniqueKeys: true });
  assert.equal(document.errors.length, 0, `${file}: ${document.errors}`);
  const workflow = document.toJS();
  assert.ok(workflow.on && workflow.jobs, `${file}: faltan triggers/jobs`);
}
require('./check-version.cjs');
const options = Object.fromEntries(Object.entries(config.packages['.']).map(([key, value]) => [
  key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value,
]));
const github = { repository: { owner: 'victorvivas27', repo: 'treasury-system' } };
const latest = { tag: TagName.parse('v1.0.0'), sha: 'a'.repeat(40), notes: '' };
const cases = [
  ['PATCH', ['fix: corrige bug'], '1.0.1'],
  ['MINOR', ['feat: agrega funcionalidad'], '1.1.0'],
  ['MAJOR', ['feat!: cambio incompatible'], '2.0.0'],
  ['Prioridad MINOR', ['fix: corrige bug', 'feat: agrega filtro'], '1.1.0'],
  ['Prioridad MAJOR', ['fix: corrige bug', 'feat: agrega filtro', 'refactor: migra contrato\n\nBREAKING CHANGE: elimina API anterior'], '2.0.0'],
  ['PERF', ['perf: reduce consultas'], '1.0.1'],
  ['fix breaking', ['fix(api)!: elimina contrato'], '2.0.0'],
  ['Squash con múltiples mensajes', ['fix: corrige bug\n\nfeat: agrega filtro'], '1.1.0'],
  ...['docs', 'test', 'refactor', 'chore', 'ci', 'build', 'style', 'config'].map(type => [type, [`${type}: actualiza archivos`], undefined]),
  ['Primera release', ['feat: incorpora versionamiento automático'], '1.0.0', true],
];
(async () => {
  for (const [name, messages, expected, initial] of cases) {
    const strategy = new Simple({ ...options, github, path: '.', targetBranch: 'main' });
    const commits = parseConventionalCommits(messages.map((message, i) => ({ message, sha: String(i + 1).repeat(40), files: ['backend/build.gradle'] })));
    const pr = await strategy.buildReleasePullRequest(commits, initial ? undefined : latest);
    assert.equal(pr?.version.toString(), expected, name);
    if (pr) {
      const updates = Object.fromEntries(pr.updates.map(update => [update.path, update.updater.updateContent(read(update.path))]));
      assert.equal(updates.VERSION.trim(), expected);
      assert.equal(JSON.parse(updates['frontend/package.json']).version, expected);
      assert.ok(updates['backend/build.gradle'].includes(`version = '${expected}'`));
      assert.ok(updates['CHANGELOG.md'].includes(expected));
      assert.equal(new TagName(pr.version).toString(), `v${expected}`);
    }
    console.log(`PASS ${name}: ${expected ?? 'sin release'}`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
