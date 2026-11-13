import { getCachedLoaderPreference } from './loaderPreferenceCache';
export const PAGE_TRANSITION_PREFERENCES_KEY = 'app-page-transition';
import type { StartupPreferences } from './startupPreferences';
export type PageTransitionPreferences = StartupPreferences;
export const DEFAULT_PAGE_TRANSITION_PREFERENCES: PageTransitionPreferences = { variant: 'cinematic', durationMs: 0, exitMs: 800 };

export function readPageTransitionPreferences(): PageTransitionPreferences {
  const cached = getCachedLoaderPreference('pageTransition');
  if (cached) return cached;
  try {
    const saved = JSON.parse(localStorage.getItem(PAGE_TRANSITION_PREFERENCES_KEY) || '{}');
    return {
      ...(saved.soundEnabled === true ? { soundEnabled: true } : {}),
      variant: saved.variant === 'video' || saved.variant === 'video-light' || saved.variant === 'nneo-rising-fill' ? saved.variant : 'cinematic',
      durationMs: typeof saved.durationMs === 'number' && Number.isFinite(saved.durationMs) ? Math.min(20000, Math.max(0, saved.durationMs)) : 0,
      exitMs: typeof saved.exitMs === 'number' && Number.isFinite(saved.exitMs) ? Math.min(3000, Math.max(400, saved.exitMs)) : 800,
    };
  } catch { return { ...DEFAULT_PAGE_TRANSITION_PREFERENCES }; }
}

export function readPageTransitionDuration(): number {
  return readPageTransitionPreferences().durationMs;
}
