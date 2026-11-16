import { randomUUID } from 'node:crypto';

const checksOf = result => ['assertionResults', 'preRequestTestResults', 'testResults', 'postResponseTestResults']
  .flatMap(key => result[key] ?? []);

// Do not retain response bodies, headers, tokens, email addresses or resolved resource IDs.
export function brunoResults(report) {
  if (!Array.isArray(report) || !report.length) throw new Error('Empty Bruno JSON report');
  const results = report.flatMap(iteration => {
    if (!Array.isArray(iteration.results)) throw new Error('Unsupported Bruno JSON report');
    return iteration.results;
  });
  if (!results.length) throw new Error('Bruno executed no requests');
  return results.map(result => {
    const checks = checksOf(result);
    const skipped = Boolean(result.skipped || result.status === 'skipped');
    const failed = Boolean(result.error || ['fail', 'failed', 'error'].includes(result.status) ||
      !(Number(result.response?.status) >= 100 && Number(result.response?.status) < 600) || checks.some(check => check.status !== 'pass'));
    return { method: result.request?.method?.toUpperCase(), url: result.request?.url,
      statusCode: Number(result.response?.status), checks: checks.length,
      status: skipped ? 'skipped' : failed ? 'failed' : 'passed' };
  });
}

function pattern(route) {
  if (/\*|\$\{/.test(route)) throw new Error(`Unsupported API mapping: ${route}`);
  // Spring path variables, including regex constraints; request query values do not define operations.
  const parts = route.replace(/\{[^{}]*(?:\{\d+(?:,\d*)?\}[^{}]*)*\}/g, '\u0000').split('\u0000');
  return new RegExp('^' + parts.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+') + '/?$');
}

export function apiCoverage(inventory, results, baseUrl) {
  if (!Array.isArray(inventory) || !inventory.length) throw new Error('Empty API inventory');
  const base = new URL(baseUrl);
  const context = base.pathname.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  const operations = inventory.map(operation => ({ ...operation, covered: false, pattern: pattern(operation.path) }));
  const sanitized = results.map(result => {
    let operation;
    if (result.url && result.method) {
      const url = new URL(result.url);
      const route = context && url.pathname.startsWith(context + '/') ? url.pathname.slice(context.length) : url.pathname;
      const candidates = url.origin === base.origin ? operations.filter(item => item.method === result.method && item.pattern.test(route)) : [];
      candidates.sort((a, b) => (a.path.match(/\{/g)?.length ?? 0) - (b.path.match(/\{/g)?.length ?? 0));
      operation = candidates[0];
      if (operation && result.status === 'passed' && result.checks > 0 && result.statusCode >= 100 && result.statusCode < 600) operation.covered = true;
    }
    return { method: result.method ?? 'UNKNOWN', operation: operation?.path ?? '(fuera del inventario)',
      status: result.status, statusCode: result.statusCode || null, checks: result.checks };
  });
  const covered = operations.filter(item => item.covered).length;
  return { metric: { covered, total: operations.length, percent: Number((100 * covered / operations.length).toFixed(2)) },
    operations: operations.map(({ pattern: ignored, ...operation }) => operation), requests: sanitized };
}

export function allureRequests(requests) {
  return requests.map((request, index) => ({ uuid: randomUUID(), historyId: `${index}-${request.method}-${request.operation}`,
    name: `${request.method} ${request.operation} · solicitud ${index + 1}`, fullName: `bruno.apoderado.${index + 1}`,
    status: request.status, stage: 'finished', labels: [{ name: 'suite', value: 'Bruno · Apoderado' }, { name: 'layer', value: 'API HTTP' }],
    description: `HTTP ${request.statusCode ?? 'sin respuesta'}; ${request.checks} comprobaciones. Sin cuerpos ni credenciales.`,
  }));
}
