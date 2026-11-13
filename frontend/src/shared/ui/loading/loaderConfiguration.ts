import { LoaderSettingsUseCases } from '@/core/B-application/use-cases/treasury/LoaderSettingsUseCases';
import { LoaderSettingsRepositoryImpl } from '@/core/C-infra/repositories/treasury/LoaderSettingsRepositoryImpl';
import { getAccessToken } from '@/core/D-config/axiosInterceptor';
import type { LoaderPreference, LoaderSection } from '@/core/A-domain/entities/treasury/LoaderSettings';
import { setCachedLoaderPreference, clearLoaderPreferenceCache } from './loaderPreferenceCache';
const useCases = new LoaderSettingsUseCases(new LoaderSettingsRepositoryImpl());
const legacyStorageKeys = ['app-startup-preview', 'app-page-transition'];

function applyLoaderPreference(section: LoaderSection, preference: LoaderPreference) {
  setCachedLoaderPreference(section, preference);
  window.dispatchEvent(new CustomEvent('app:loader-settings', { detail: { section, preference } }));
}

export async function loadLoaderConfiguration() {
  const token = getAccessToken();
  const configuration = await useCases.get();
  if (getAccessToken() !== token) throw new Error('La sesión cambió.');
  applyLoaderPreference('startup', configuration.startup);
  applyLoaderPreference('pageTransition', configuration.pageTransition);
  return configuration;
}

export async function saveLoaderPreference(section: LoaderSection, preference: LoaderPreference) {
  const token = getAccessToken();
  const saved = await useCases.save(section, preference);
  if (getAccessToken() !== token) throw new Error('La sesión cambió.');
  applyLoaderPreference(section, saved);
  return saved;
}

export function clearLoaderConfiguration() {
  clearLoaderPreferenceCache();
  for (const key of legacyStorageKeys) {
    try { localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  }
}

export async function syncLoaderConfiguration() {
  try { await loadLoaderConfiguration(); } catch { /* A cosmetic setting must not prevent sign-in. */ }
}
