import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authenticateBrunoAdmin, extractTermsVersion } from './bruno-auth.mjs';

test('terms version is read from the backend source of truth', () => {
  assert.equal(extractTermsVersion('public static final String CURRENT_TERMS_VERSION = "2026-11-16";'), '2026-11-16');
  assert.throws(() => extractTermsVersion('public static final String OTHER = "2026-11-16";'), /current terms version/);
});

test('Bruno administrator login includes current terms and returns the token', async () => {
  let request;
  const token = await authenticateBrunoAdmin('http://localhost:5055/api/v1',
    { Admin_Email: 'admin@example.test', Admin_Password: 'Temporary-Password-123!' }, '2026-11-16',
    async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ token: 'fixture-access-token' }) };
    });

  assert.equal(token, 'fixture-access-token');
  assert.equal(request.url, 'http://localhost:5055/api/v1/auth/login');
  assert.deepEqual(JSON.parse(request.options.body), {
    correo: 'admin@example.test', password: 'Temporary-Password-123!', termsVersion: '2026-11-16',
  });
});

test('Bruno administrator login fails clearly when authentication does not issue a token', async () => {
  await assert.rejects(() => authenticateBrunoAdmin('http://localhost:5055/api/v1',
    { Admin_Email: 'admin@example.test', Admin_Password: 'wrong' }, '2026-11-16',
    async () => ({ ok: true, json: async () => ({ termsAcceptanceRequired: true }) })), /did not return an access token/);
});
