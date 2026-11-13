import { LoaderSettingsUseCases } from '@/core/B-application/use-cases/treasury/LoaderSettingsUseCases';
import { LoaderSettingsRepositoryImpl } from '@/core/C-infra/repositories/treasury/LoaderSettingsRepositoryImpl';
import { getAccessToken } from '@/core/D-config/axiosInterceptor';
import type { LoaderPreference, LoaderSection } from '@/core/A-domain/entities/treasury/LoaderSettings';
import { STARTUP_PREFERENCES_KEY } from './startupPreferences';
import { setCachedLoaderPreference, clearLoaderPreferenceCache } from './loaderPreferenceCache';
import { PAGE_TRANSITION_PREFERENCES_KEY } from './pageTransitionPreferences';
const useCases = new LoaderSettingsUseCases(new LoaderSettingsRepositoryImpl());
const keys = { startup: STARTUP_PREFERENCES_KEY, pageTransition: PAGE_TRANSITION_PREFERENCES_KEY };
export function cacheLoaderPreference(section: LoaderSection, preference: LoaderPreference) {
  setCachedLoaderPreference(section, preference);
  try { localStorage.setItem(keys[section], JSON.stringify(preference)); } catch { /* In-memory configuration still applies. */ }
  window.dispatchEvent(new CustomEvent('app:loader-settings', { detail: { section, preference } }));
}
export async function loadLoaderConfiguration() {
  const token = getAccessToken();
  const configuration = await useCases.get();
  if (getAccessToken() !== token) throw new Error('La sesión cambió.');
  cacheLoaderPreference('startup', configuration.startup);
  cacheLoaderPreference('pageTransition', configuration.pageTransition);
  return configuration;
}
export async function saveLoaderPreference(section: LoaderSection, preference: LoaderPreference) {
  const token = getAccessToken();
  const saved = await useCases.save(section, preference);
  if (getAccessToken() !== token) throw new Error('La sesión cambió.');
  cacheLoaderPreference(section, saved);
  return saved;
}
export function clearLoaderConfiguration() {
  clearLoaderPreferenceCache();
  for (const key of Object.values(keys)) {
    try { localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  }
}
export async function syncLoaderConfiguration() {
  try { await loadLoaderConfiguration(); } catch { /* A cosmetic setting must not prevent sign-in. */ }
}
