const config = require('./.commitlintrc.json');

// Commit 115da59914e20c0a53ac8d0909d71d1e1f618b3d was already published
// through PR #214. Keep the permanent branch history instead of rewriting it.
// Only this exact historical message is exempt; new commits retain all rules.
const publishedLegacyMessage = [
  'Release/academic sidebar production (#213)',
  '',
  '* feat(academic): publish schedules, private architecture and navigation improvements',
  '',
  '* feat(schedule): mejorar validación y manejo de errores en la publicación del horario',
].join('\n');

module.exports = {
  ...config,
  ignores: [message => message.trim() === publishedLegacyMessage],
};
