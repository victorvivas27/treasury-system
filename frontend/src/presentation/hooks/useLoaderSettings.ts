import { useEffect, useState } from 'react';
import type { LoaderPreference, LoaderSection } from '@/core/A-domain/entities/treasury/LoaderSettings';
import { loadLoaderConfiguration } from '@/shared/ui/loading/loaderConfiguration';
import { getCachedLoaderPreference } from '@/shared/ui/loading/loaderPreferenceCache';
export function useLoaderSettings(section: LoaderSection, onLoaded: (value: LoaderPreference) => void) {
  const [loading, setLoading] = useState(() => !getCachedLoaderPreference(section));
  const [error, setError] = useState('');
  useEffect(() => {
    const cached = getCachedLoaderPreference(section);
    if (cached) { onLoaded(cached); return; }
    let active = true;
    void loadLoaderConfiguration().then(configuration => {
      if (active) onLoaded(configuration[section]);
    }).catch(() => { if (active) setError('No se pudo cargar la configuración del curso. Recarga para intentarlo nuevamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [section, onLoaded]);
  return { loading, error };
}
