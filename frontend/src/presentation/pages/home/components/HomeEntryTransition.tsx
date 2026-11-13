import { useEffect, useState } from 'react';
import { PageEntryVisual } from '@/shared/ui/loading/PageEntryVisual';
import { readPageTransitionPreferences } from '@/shared/ui/loading/pageTransitionPreferences';

export function HomeEntryTransition({ ready, onExited }: { ready: boolean; onExited: () => void }) {
  const [preferences] = useState(readPageTransitionPreferences);
  const [coveredByBoot] = useState(() => document.getElementById('app-boot-loader')?.dataset.variant === 'nneo-rising-fill');
  useEffect(() => {
    if (coveredByBoot && ready) onExited();
  }, [coveredByBoot, ready, onExited]);
  if (coveredByBoot) return <span className="page-transition-content" hidden inert={!ready} />;
  return <PageEntryVisual ready={ready} onExited={onExited} preferences={preferences} />;
}
