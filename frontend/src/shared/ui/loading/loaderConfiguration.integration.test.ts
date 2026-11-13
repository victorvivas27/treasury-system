import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { apiClient } from '@/core/D-config/api';
import { setAccessToken } from '@/core/D-config/axiosInterceptor';
import { clearLoaderConfiguration, loadLoaderConfiguration, saveLoaderPreference, syncLoaderConfiguration } from './loaderConfiguration';
import { getCachedLoaderPreference } from './loaderPreferenceCache';
import { readPageTransitionPreferences } from './pageTransitionPreferences';
import type { LoaderConfiguration } from '@/core/A-domain/entities/treasury/LoaderSettings';
vi.mock('@/core/D-config/api', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }));
let server: LoaderConfiguration;
beforeEach(() => {
  clearLoaderConfiguration();
  vi.resetAllMocks();
  setAccessToken('account-a');
  server = { startup: { variant: 'video', durationMs: 10000, exitMs: 1400 }, pageTransition: { variant: 'cinematic', durationMs: 0, exitMs: 800 } };
  vi.mocked(apiClient.get).mockImplementation(async () => ({ data: structuredClone(server) }));
  vi.mocked(apiClient.put).mockImplementation(async (url, preference) => {
    const section = String(url).endsWith('/inicio') ? 'startup' : 'pageTransition';
    server[section] = structuredClone(preference);
    return { data: server[section] };
  });
});
afterEach(() => { vi.restoreAllMocks(); clearLoaderConfiguration(); setAccessToken(null); });

it('persists the admin selection on the server and delivers it to a different browser/account', async () => {
  const preference = { variant: 'nneo-rising-fill', durationMs: 0, exitMs: 900, soundEnabled: true } as const;
  await saveLoaderPreference('pageTransition', preference);
  expect(apiClient.put).toHaveBeenCalledWith('/tesoreria/configuracion-general/loaders/paginas', preference);
  clearLoaderConfiguration();
  setAccessToken('account-b');
  await loadLoaderConfiguration();
  expect(readPageTransitionPreferences()).toEqual(preference);
  expect(getCachedLoaderPreference('startup')?.variant).toBe('video');
});

it('keeps the server authoritative even if browser storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked'); });
  await saveLoaderPreference('startup', { variant: 'nneo-rising-fill', durationMs: 0, exitMs: 900 });
  expect(getCachedLoaderPreference('startup')?.variant).toBe('nneo-rising-fill');
});

it('ignores legacy browser overrides and never persists server settings in the browser', async () => {
  localStorage.setItem('app-startup-preview', JSON.stringify({ variant: 'video-light' }));
  localStorage.setItem('app-page-transition', JSON.stringify({ variant: 'video-light' }));
  expect(getCachedLoaderPreference('startup')).toBeUndefined();
  expect(readPageTransitionPreferences().variant).toBe('cinematic');
  clearLoaderConfiguration();
  await loadLoaderConfiguration();
  expect(localStorage.getItem('app-startup-preview')).toBeNull();
  expect(localStorage.getItem('app-page-transition')).toBeNull();
});

it('does not report failed saves as applied and does not block login on read failures', async () => {
  vi.mocked(apiClient.put).mockRejectedValueOnce(Error('offline'));
  await expect(saveLoaderPreference('startup', { variant: 'nneo-rising-fill', durationMs: 0, exitMs: 900 })).rejects.toThrow();
  expect(getCachedLoaderPreference('startup')).toBeUndefined();
  vi.mocked(apiClient.get).mockRejectedValueOnce(Error('offline'));
  await expect(syncLoaderConfiguration()).resolves.toBeUndefined();
});

it('discards a response arriving after the account or organization changes', async () => {
  let release!: (value: { data: LoaderConfiguration }) => void;
  vi.mocked(apiClient.get).mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  const pending = loadLoaderConfiguration();
  setAccessToken('another-organization');
  release({ data: { ...server, startup: { variant: 'nneo-rising-fill', durationMs: 0, exitMs: 900 } } });
  await expect(pending).rejects.toThrow();
  expect(getCachedLoaderPreference('startup')).toBeUndefined();
});
