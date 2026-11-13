import { getCachedLoaderPreference } from '@/shared/ui/loading/loaderPreferenceCache';
import { useEffect, useState } from 'react';
import { PageEntryVisual } from '@/shared/ui/loading/PageEntryVisual';
import { readPageTransitionPreferences } from '@/shared/ui/loading/pageTransitionPreferences';

export function HomeEntryTransition({ ready, onExited }: { ready: boolean; onExited: () => void }) {
  const [preferences] = useState(readPageTransitionPreferences);
  const [skipEntryVisual] = useState(() => Boolean(document.getElementById('app-boot-loader')) || !getCachedLoaderPreference('pageTransition'));
  useEffect(() => {
    if (skipEntryVisual && ready) onExited();
  }, [skipEntryVisual, ready, onExited]);
  if (skipEntryVisual) return <span className="page-transition-content" hidden inert={!ready} />;
  return <PageEntryVisual ready={ready} onExited={onExited} preferences={preferences} />;
}
