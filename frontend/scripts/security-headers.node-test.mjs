import { test } from "node:test";
import assert from "node:assert/strict";
import { securityHeaders } from "./security-headers.mjs";

test("uses exact API/WS origins without credentials, paths or broad HTTPS exceptions", () => {
  const headers = securityHeaders("https://api.example.test/tesoreria/api/v1");
  assert.match(headers, /connect-src 'self' https:\/\/api.example.test wss:\/\/api.example.test blob: data:/);
  assert.doesNotMatch(headers, /unsafe-eval|connect-src[^;]*\shttps: |report-uri|report-to/);
  assert.match(headers, /Content-Security-Policy-Report-Only/);
  assert.match(headers, /Content-Security-Policy "frame-ancestors 'none'; object-src 'none'" always/);
  for (const line of headers.trim().split("\n")) assert.match(line, / always;$/);
  assert.doesNotMatch(headers, /Strict-Transport-Security/);
});

test("supports HTTP loopback development and rejects unsafe configuration", () => {
  assert.match(securityHeaders(), /ws:\/\/localhost:5055/);
  for (const url of ["javascript:alert(1)", "https://user:password@api.example.test", 'https://api.example.test"; injected']) {
    assert.throws(() => securityHeaders(url));
  }
});
