import { getCachedLoaderPreference } from './loaderPreferenceCache';
export const STARTUP_PREFERENCES_KEY = 'app-startup-preview';
export type { LoaderPreference as StartupPreferences } from '@/core/A-domain/entities/treasury/LoaderSettings';
import type { LoaderPreference as StartupPreferences } from '@/core/A-domain/entities/treasury/LoaderSettings';
export const DEFAULT_STARTUP_PREFERENCES: StartupPreferences = {
  variant: 'video', durationMs: 10000, exitMs: 1400,
};

export function readStartupPreferences(): StartupPreferences {
  const cached = getCachedLoaderPreference('startup');
  if (cached) return cached;
  try {
    const saved = JSON.parse(localStorage.getItem(STARTUP_PREFERENCES_KEY) || '{}');
    return {
      ...(saved.soundEnabled === true ? { soundEnabled: true } : {}),
      variant: saved.variant === 'cinematic' || saved.variant === 'video-light' || saved.variant === 'nneo-rising-fill' ? saved.variant : 'video',
      durationMs: typeof saved.durationMs === 'number' && Number.isFinite(saved.durationMs)
        ? Math.min(20000, Math.max(0, saved.durationMs)) : saved.variant === 'nneo-rising-fill' ? 0 : 10000,
      exitMs: typeof saved.exitMs === 'number' && Number.isFinite(saved.exitMs)
        ? Math.min(3000, Math.max(400, saved.exitMs)) : 1400,
    };
  } catch { return { ...DEFAULT_STARTUP_PREFERENCES }; }
}
