import { useEffect, useRef, useState } from 'react';
import { publicImages } from '@/shared/assets/publicImages';
import { lockBodyScroll } from '@/shared/ui/dialog/scrollLock';
import { createInitialVideo } from './initialVideo.js';
import { createInitialCinematic } from './initialCinematic.js';
import { createNneoRisingFill } from './nneoRisingFill.js';
import video from '@/assets/video/tesoreria_animado.mp4?url';
import videoLight from '@/assets/video/tesoreria_animado_02.mp4?url';
import type { PageTransitionPreferences } from './pageTransitionPreferences';
import './initialCinematic.css';
import './initialVideo.css';
import './nneoRisingFill.css';
import './PageEntryVisual.css';

export function PageEntryVisual({ ready, onExited, preferences }: { ready: boolean; onExited: () => void; preferences: PageTransitionPreferences }) {
  const element = useRef<HTMLDivElement>(null);
  const visual = useRef<ReturnType<typeof createInitialVideo> | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [leaving, setLeaving] = useState(false);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;
  const exitMs = preferences.exitMs;
  useEffect(() => lockBodyScroll(), []);
  useEffect(() => {
    const loader = element.current!;
    visual.current = preferences.variant === 'nneo-rising-fill'
      ? createNneoRisingFill(loader, { exitMs, soundEnabled: preferences.soundEnabled, onExited: () => onExitedRef.current() })
      : preferences.variant === 'cinematic'
      ? createInitialCinematic(loader, Object.entries(publicImages).map(([name, src]) => ({ src, artwork: name.startsWith('login') ? 'full' : 'community', story: name.startsWith('login') ? 0 : ['communityGoals', 'communityJoy', 'communityTree'].includes(name) ? 2 : 1 })))
      : createInitialVideo(loader, preferences.variant === 'video-light' ? videoLight : video, publicImages.loginMobile, Object.entries(publicImages).filter(([name]) => name.startsWith('community')).map(([, src]) => src));
    return () => { visual.current?.stop(); visual.current = null; };
  }, [preferences.variant, preferences.soundEnabled, exitMs]);
  useEffect(() => {
    if (!ready) return;
    visual.current?.markReady();
    let exitTimer: number | undefined;
    const timer = window.setTimeout(() => {
      if (preferences.variant === 'nneo-rising-fill') { visual.current?.finish(); return; }
      setLeaving(true);
      exitTimer = window.setTimeout(onExited, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : exitMs);
    }, Math.max(0, preferences.durationMs - (Date.now() - startedAt)));
    return () => { clearTimeout(timer); clearTimeout(exitTimer); };
  }, [ready, onExited, preferences.durationMs, preferences.variant, startedAt, exitMs]);
  return <div ref={element} className={`app-startup page-entry-visual${leaving ? ' is-leaving' : ''}`} data-variant={preferences.variant} data-exit-duration={exitMs}
    style={{ '--boot-video-exit-duration': `${exitMs}ms` } as React.CSSProperties} role="status" aria-label={ready ? 'Todo listo' : 'Preparando la página'} />;
}
