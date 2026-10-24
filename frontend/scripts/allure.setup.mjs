import { beforeEach } from 'vitest';
import { parameter } from 'allure-js-commons';

// Equal test.each titles are distinct cases, not retries. Vitest IDs are
// deterministic for the same file/project/order; never use the run UUID here.
beforeEach(async ({ task }) => {
  if (task.each) await parameter('vitest.caseId', task.id, { mode: 'hidden' });
});
