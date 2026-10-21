import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '@/core/D-config/api';
import { clearAccessToken, clearCsrfToken, getAccessToken } from '@/core/D-config/axiosInterceptor';
import { AuthProvider, useAuth } from './AuthContext';

const originalAdapter = apiClient.defaults.adapter;
const user = { id: 7, code: 'USR-007', nombre: 'TEST USER', correo: 'user@example.test',
  rol: 'USER', enabled: true, accountNonLocked: true, createdAt: '', updatedAt: '' };
const token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
const session = { token, user, csrfToken: 'csrf-test', tokenType: 'Bearer', expiresIn: 3600 };
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
let requests: InternalAxiosRequestConfig[];
let respond: (request: InternalAxiosRequestConfig) => unknown;

function reject(request: InternalAxiosRequestConfig, status: number) {
  throw new AxiosError('Rejected', 'ERR_BAD_REQUEST', request, undefined,
    { data: { message: 'Rejected' }, status, statusText: 'Rejected', headers: {}, config: request });
}

beforeEach(() => {
  requests = [];
  clearAccessToken();
  clearCsrfToken();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('treasury.auth.manual-logout', 'true');
  respond = request => request.url === '/auth/me' ? user : session;
  const adapter: AxiosAdapter = async request => {
    requests.push(request);
    return { data: JSON.stringify(await respond(request)), status: 200, statusText: 'OK',
      headers: {}, config: request };
  };
  apiClient.defaults.adapter = adapter;
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  clearAccessToken();
  clearCsrfToken();
  localStorage.clear();
  sessionStorage.clear();
});

describe('Authentication through context, use cases, repository and HTTP transport', () => {
  it('logs in for the selected organization and keeps the access token out of browser storage', async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await act(async () => { await result.current.login(user.correo, 'Password1!', 4); });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(user);
    expect(getAccessToken()).toBe(token);
    expect(sessionStorage.getItem('treasury.auth.token')).toBeNull();
    expect(localStorage.getItem('treasury.auth.token')).toBeNull();
    expect(sessionStorage.getItem('treasury.auth.csrf')).toBe('csrf-test');
    expect(JSON.parse(requests[0].data)).toEqual({ correo: user.correo, password: 'Password1!', organizationId: 4 });
    expect(requests[0].timeout).toBe(30000);
    expect(requests[0].withCredentials).toBe(true);
  });

  it('does not establish a session when organization selection is required', async () => {
    const selection = { requiresOrganizationSelection: true, organizations: [{ id: 4, name: 'School' }] };
    respond = () => selection;
    const { result } = renderHook(useAuth, { wrapper });
    await act(async () => {
      expect(await result.current.login(user.correo, 'Password1!')).toEqual(selection);
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(sessionStorage.getItem('treasury.auth.user')).toBeNull();
  });

  it.each([401, 403, 500])('does not persist a session after login fails with HTTP %i', async status => {
    respond = request => reject(request, status);
    const { result } = renderHook(useAuth, { wrapper });
    await act(async () => {
      await expect(result.current.login(user.correo, 'incorrect')).rejects.toBeInstanceOf(AxiosError);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem('treasury.auth.user')).toBeNull();
    expect(requests).toHaveLength(1);
  });

  it('restores a session using the refresh cookie without a stored access token', async () => {
    localStorage.removeItem('treasury.auth.manual-logout');
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual(user);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('/auth/refresh');
    expect(requests[0].withCredentials).toBe(true);
    expect(getAccessToken()).toBe(token);
  });

  it('logs out locally even if HTTP revocation fails and sends the session credential', async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await act(async () => { await result.current.login(user.correo, 'Password1!'); });
    respond = request => reject(request, 503);
    await act(async () => { await result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(sessionStorage.getItem('treasury.auth.user')).toBeNull();
    expect(sessionStorage.getItem('treasury.auth.csrf')).toBeNull();
    expect(localStorage.getItem('treasury.auth.manual-logout')).toBe('true');
    await waitFor(() => expect(requests.some(request => request.url === '/auth/logout')).toBe(true));
    const logout = requests.find(request => request.url === '/auth/logout')!;
    expect(logout.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(logout.timeout).toBe(2500);
    expect(logout.withCredentials).toBe(true);
  });
});
