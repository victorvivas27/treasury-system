import type { LoaderConfiguration, LoaderPreference, LoaderSection } from '@/core/A-domain/entities/treasury/LoaderSettings';
let current: Partial<LoaderConfiguration> = {};
export function getCachedLoaderPreference(section: LoaderSection) { return current[section]; }
export function setCachedLoaderPreference(section: LoaderSection, preference: LoaderPreference) { current = { ...current, [section]: preference }; }
export function clearLoaderPreferenceCache() { current = {}; }
