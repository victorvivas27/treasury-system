export const PAGE_TRANSITION_PREFERENCES_KEY = 'app-page-transition';
export type PageTransitionPreferences = { variant: 'video' | 'cinematic' | 'video-light'; durationMs: number; exitMs: number };
export const DEFAULT_PAGE_TRANSITION_PREFERENCES: PageTransitionPreferences = { variant: 'cinematic', durationMs: 0, exitMs: 800 };

export function readPageTransitionPreferences(): PageTransitionPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(PAGE_TRANSITION_PREFERENCES_KEY) || '{}');
    return {
      variant: saved.variant === 'video' || saved.variant === 'video-light' ? saved.variant : 'cinematic',
      durationMs: typeof saved.durationMs === 'number' && Number.isFinite(saved.durationMs) ? Math.min(20000, Math.max(0, saved.durationMs)) : 0,
      exitMs: typeof saved.exitMs === 'number' && Number.isFinite(saved.exitMs) ? Math.min(3000, Math.max(400, saved.exitMs)) : 800,
    };
  } catch { return { ...DEFAULT_PAGE_TRANSITION_PREFERENCES }; }
}

export function readPageTransitionDuration(): number {
  return readPageTransitionPreferences().durationMs;
}
