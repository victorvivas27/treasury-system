const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const HISTORICAL_INVALID_SHA = '327163e6656aa9a731686545e91ac0849051748a';
const HISTORICAL_INVALID_MESSAGE = 'Add integration tests for AdministrationsPage, AnnualFeesPage, and EventsPage; create tsconfig for testing environment';
const PREVIOUS_LEGACY_SHA = '115da59914e20c0a53ac8d0909d71d1e1f618b3d';
const PREVIOUS_LEGACY_MESSAGE = [
  'Release/academic sidebar production (#213)',
  '',
  '* feat(academic): publish schedules, private architecture and navigation improvements',
  '',
  '* feat(schedule): mejorar validación y manejo de errores en la publicación del horario',
].join('\n');
const TYPES = new Set(['feat', 'fix', 'perf', 'docs', 'style', 'refactor', 'test', 'chore', 'config', 'ci', 'build']);

function validate(message, { sha } = {}) {
  const trimmed = message.trim();
  if ((sha === HISTORICAL_INVALID_SHA && trimmed === HISTORICAL_INVALID_MESSAGE) ||
      (sha === PREVIOUS_LEGACY_SHA && trimmed === PREVIOUS_LEGACY_MESSAGE)) return null;
  if (/^Merge .+/.test(trimmed) || /^Revert ".+"$/.test(trimmed)) return null;
  const header = trimmed.split(/\r?\n/, 1)[0];
  const match = /^(\w+)(?:\(([a-z0-9][a-z0-9._/-]*)\))?(!)?: (\S.*)$/.exec(header);
  if (!match) return 'Formato requerido: <tipo>(<scope opcional>)<opcional !>: <descripción>.';
  if (!TYPES.has(match[1])) return `Tipo no permitido: ${match[1]}. Tipos: ${[...TYPES].join(', ')}.`;
  if (header.length < 5) return 'El encabezado debe tener al menos 5 caracteres.';
  if (header.length > 200) return 'El encabezado no puede superar 200 caracteres.';
  return null;
}

function main(args) {
  let message;
  let sha;
  if (args[0] === '--commit' && args[1]) {
    sha = args[1];
    message = execFileSync('git', ['show', '-s', '--format=%B', sha], { encoding: 'utf8' });
  } else if (args[0] === '--range' && args[1] && args[2]) {
    const commits = execFileSync('git', ['rev-list', '--reverse', `${args[1]}..${args[2]}`], { encoding: 'utf8' })
      .trim().split(/\r?\n/).filter(Boolean);
    for (const commit of commits) {
      const commitMessage = execFileSync('git', ['show', '-s', '--format=%B', commit], { encoding: 'utf8' });
      const error = validate(commitMessage, { sha: commit });
      if (error) {
        console.error(`Commit ${commit} invÃ¡lido: ${error}\nMensaje: ${commitMessage.trim().split(/\r?\n/, 1)[0]}`);
        process.exitCode = 1;
      }
    }
    return;
  } else if (args[0]) message = fs.readFileSync(args[0], 'utf8');
  else throw new Error('Uso: node scripts/validate-commit-message.cjs <archivo> | --commit <sha> | --range <base> <head>');
  const error = validate(message, { sha });
  if (error) {
    console.error(`Commit inválido: ${error}\nMensaje: ${message.trim().split(/\r?\n/, 1)[0]}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { validate, HISTORICAL_INVALID_SHA, HISTORICAL_INVALID_MESSAGE, PREVIOUS_LEGACY_SHA, PREVIOUS_LEGACY_MESSAGE };
