const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const crypto = require('node:crypto');
const yamlPackage = process.env.RELEASE_TOOLS_DIR
  ? path.join(process.env.RELEASE_TOOLS_DIR, 'package.json')
  : fs.realpathSync(path.join(__dirname, '../frontend/node_modules/vite/package.json'));
const yaml = createRequire(yamlPackage)('yaml');
const workflow = yaml.parse(fs.readFileSync(path.join(__dirname, '../.github/workflows/07-deploy-backend.yml'), 'utf8'));
const steps = workflow.jobs['build-and-deploy'].steps;
const deployment = steps.find(step => step.uses?.startsWith('google-github-actions/deploy-cloudrun@'));

test('image-only deployment preserves runtime variables and secret bindings', () => {
  assert.ok(deployment);
  assert.equal(deployment.with.env_vars_update_strategy, 'merge');
  assert.equal(deployment.with.secrets_update_strategy, 'merge');
  for (const input of ['env_vars', 'env_vars_file', 'secrets']) assert.equal(deployment.with[input], undefined);
  assert.equal(deployment.with.flags, undefined);
  assert.ok(deployment.with.image);
  const preflight = steps.findIndex(step => step.run?.includes('gcloud run services describe'));
  assert.ok(preflight >= 0 && preflight < steps.indexOf(deployment));
});

test('no deployment step clears configuration or invents trusted proxy CIDRs', () => {
  const commands = steps.map(step => step.run || '').join('\n') + '\n' + (deployment.with.flags || '');
  assert.doesNotMatch(commands, /--(?:set|update|remove|clear)-env-vars|--env-vars-file|--(?:set|update|remove|clear)-secrets/);
  assert.doesNotMatch(commands, /SECURITY_TRUSTED_PROXIES|0\.0\.0\.0\/0|::\/0/);
  assert.equal(workflow.on.workflow_dispatch !== undefined, true);
});

test('temporary production migration line preserves v1.34.0 structures and historical SQL', () => {
  const migrations = path.join(__dirname, '../backend/src/main/resources/db/migration');
  const pending = fs.readdirSync(migrations).filter(name => /^V(?:5[5-9]|[6-9]\d|\d{3,})__/.test(name));
  assert.ok(pending.includes('V58__expand_shared_security_and_preserve_legacy.sql'));
  assert.equal(pending.some(name => /^V5[567]__/.test(name)), false);
  const expansion = fs.readFileSync(path.join(migrations, 'V58__expand_shared_security_and_preserve_legacy.sql'), 'utf8');
  assert.match(expansion, /CREATE TABLE security_rate_buckets/);
  assert.match(expansion, /CREATE TABLE security_mail_requests/);
  assert.doesNotMatch(expansion, /\bDROP\s+(?:TABLE|COLUMN)|\bDELETE\s+FROM|\bTRUNCATE\b/i);
  const historical = fs.readFileSync(path.join(__dirname, '../backend/migration-history/V55__remove_guardian_message_integration.sql'));
  assert.equal(crypto.createHash('sha256').update(historical).digest('hex'), '9dd53fe10a517ad06050b96d3fd3849e3c134e8273fa50bc6ead3a86f3b96e3d');
});
