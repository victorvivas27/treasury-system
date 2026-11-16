import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiCoverage, allureRequests, brunoResults } from './bruno-coverage.mjs';

const base = 'http://localhost:5055/tesoreria/api/v1';
const inventory = [{ method: 'GET', path: '/api/v1/users/{id}' }, { method: 'GET', path: '/api/v1/users/me' },
  { method: 'POST', path: '/api/v1/users' }, { method: 'DELETE', path: '/api/v1/users/{id}' }];
const request = (url, method = 'GET', status = 'passed', checks = 1) => ({ url: base + url, method, status, checks, statusCode: 200 });

test('API coverage counts unique checked method/routes, prefers static paths and ignores query parameters', () => {
  const coverage = apiCoverage(inventory, [request('/users/me'), request('/users/42?a=1'), request('/users/43'),
    request('/users', 'POST', 'failed'), request('/users/43', 'DELETE', 'passed', 0)], base);
  assert.deepEqual(coverage.metric, { covered: 2, total: 4, percent: 50 });
  assert.equal(coverage.requests[0].operation, '/api/v1/users/me');
  assert.ok(!JSON.stringify(coverage).includes('42'));
  assert.ok(!JSON.stringify(coverage).includes('?a='));
});
test('failed, skipped, unchecked and foreign-origin requests never count as tested API operations', () => {
  const coverage = apiCoverage(inventory, [request('/users/3', 'GET', 'skipped'), request('/users', 'POST', 'failed'),
    request('/users/me', 'GET', 'passed', 0), { ...request('/users/me'), url: 'http://foreign/api/v1/users/me' }], base);
  assert.equal(coverage.metric.covered, 0);
  assert.equal(coverage.metric.total, 4);
  assert.throws(() => apiCoverage([], [], base), /Empty/);
});
test('Bruno conversion includes every test phase and removes sensitive HTTP data from Allure', () => {
  const raw = [{ results: [{ request: { method: 'get', url: base + '/users/me', headers: { Authorization: 'secret-token' } },
    response: { status: 200, data: { password: 'secret-password' } }, testResults: [{ status: 'pass' }],
    preRequestTestResults: [{ status: 'pass' }], assertionResults: [], postResponseTestResults: [] },
  { skipped: true }, { request: {}, error: 'private transport error' }] }];
  const parsed = brunoResults(raw);
  assert.equal(parsed[0].checks, 2);
  assert.equal(parsed[1].status, 'skipped');
  assert.equal(parsed[2].status, 'failed');
  const serialized = JSON.stringify(allureRequests(apiCoverage(inventory, parsed, base).requests));
  assert.ok(!serialized.includes('secret'));
  assert.ok(!serialized.includes('private transport error'));
  assert.throws(() => brunoResults([]), /Empty/);
  assert.throws(() => brunoResults([{}]), /Unsupported/);
});
