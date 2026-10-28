const { execFileSync } = require('node:child_process');
const { appendFileSync } = require('node:fs');

const fields = ['frontend_artifact', 'backend_artifact', 'frontend_key', 'backend_key'];

function selectEvidence(sha, inputs) {
  const supplied = ['validated_sha', ...fields].some(field => inputs[field]);
  if (!supplied) return { sha, reuse: 'false' };
  if (!/^[a-f0-9]{40}$/.test(inputs.validated_sha ?? '') || inputs.validated_sha !== sha) {
    throw new Error('Shared evidence must match the exact selected release commit');
  }
  for (const field of fields) {
    const pattern = field.endsWith('_artifact') ? /^[1-9][0-9]*$/ : /^[a-f0-9]{64}$/;
    if (!pattern.test(inputs[field] ?? '')) throw new Error(`Invalid or missing shared evidence: ${field}`);
  }
  if (inputs.frontend_artifact === inputs.backend_artifact) throw new Error('Suites require distinct artifacts');
  return { sha, reuse: 'true', ...Object.fromEntries(fields.map(field => [field, inputs[field]])) };
}

if (require.main === module) {
  const inputs = Object.fromEntries(['validated_sha', ...fields].map(field => [field, process.env[field.toUpperCase()] ?? '']));
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  // The evidence job selects artifacts only after the resolve job has accepted reuse.
  const outputs = process.argv.includes('--outputs')
    ? selectEvidence(sha, { ...inputs, validated_sha: sha })
    : selectEvidence(sha, inputs);
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(''));
}

module.exports = { selectEvidence };
