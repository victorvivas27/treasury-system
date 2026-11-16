export function extractTermsVersion(source) {
  const version = source.match(/CURRENT_TERMS_VERSION\s*=\s*"([^"]+)"/)?.[1];
  if (!version) throw new Error('Cannot determine the current terms version for Bruno authentication');
  return version;
}

export async function authenticateBrunoAdmin(baseUrl, credentials, termsVersion, fetchImpl = fetch) {
  const response = await fetchImpl(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ correo: credentials.Admin_Email, password: credentials.Admin_Password, termsVersion }),
  });
  if (!response.ok) throw new Error(`Bruno administrator login failed with HTTP ${response.status}`);
  const body = await response.json();
  if (typeof body.token !== 'string' || !body.token.trim()) {
    throw new Error('Bruno administrator login did not return an access token');
  }
  return body.token;
}
