import { getCachedLoaderPreference } from './loaderPreferenceCache';
import type { LoaderPreference } from '@/core/A-domain/entities/treasury/LoaderSettings';

export type PageTransitionPreferences = LoaderPreference;
export const DEFAULT_PAGE_TRANSITION_PREFERENCES: PageTransitionPreferences = { variant: 'cinematic', durationMs: 0, exitMs: 800 };

export function readPageTransitionPreferences(): PageTransitionPreferences {
  return getCachedLoaderPreference('pageTransition') ?? { ...DEFAULT_PAGE_TRANSITION_PREFERENCES };
}
