import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brunoFixtureSettings } from './bruno-fixture.mjs';

const environment = { BRUNO_TEST_JDBC_URL: 'jdbc:postgresql://127.0.0.1:15439/bruno_coverage',
  BRUNO_TEST_DB_USER: 'bruno_test', BRUNO_TEST_DB_PASSWORD: 'ephemeral' };
test('disposable fixture generates unique credentials and shares the password only with the seeder', () => {
  const first = brunoFixtureSettings(environment);
  const second = brunoFixtureSettings(environment);
  assert.equal(first.credentials.Admin_Email, 'admin@bruno.invalid');
  assert.equal(first.credentials.Admin_Password, first.environment.BRUNO_SEED_PASSWORD);
  assert.notEqual(first.credentials.Admin_Password, second.credentials.Admin_Password);
  assert.match(first.credentials.Admin_Password, /[A-Z]/);
  assert.match(first.credentials.Admin_Password, /[a-z]/);
  assert.match(first.credentials.Admin_Password, /[0-9]/);
  assert.match(first.credentials.Admin_Password, /[^a-zA-Z0-9]/);
  assert.equal(environment.BRUNO_SEED_PASSWORD, undefined);
});
test('fixture refuses remote or non-test databases and missing credentials', () => {
  for (const url of ['jdbc:postgresql://remote:5432/bruno_test', 'jdbc:postgresql://localhost:5432/production',
    'jdbc:postgresql://localhost:5432/bruno_test?options=extra', '']) {
    assert.throws(() => brunoFixtureSettings({ ...environment, BRUNO_TEST_JDBC_URL: url }), /disposable/);
  }
  assert.throws(() => brunoFixtureSettings({ ...environment, BRUNO_TEST_DB_PASSWORD: '' }), /credentials/);
});
