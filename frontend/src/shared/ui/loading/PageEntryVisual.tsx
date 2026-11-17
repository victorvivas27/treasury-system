import { useEffect, useRef } from 'react';
import { lockBodyScroll } from '@/shared/ui/dialog/scrollLock';
import { createNneoRisingFill } from './nneoRisingFill.js';
import './initialLoader.css';
import './nneoRisingFill.css';

export function PageEntryVisual({ onExited }: { onExited: () => void }) {
  const element = useRef<HTMLDivElement>(null);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  useEffect(() => lockBodyScroll(), []);
  useEffect(() => {
    const visual = createNneoRisingFill(element.current!, {
      exitMs: 800, soundEnabled: false, onExited: () => onExitedRef.current(),
    });
    visual.markReady();
    visual.finish();
    return () => visual.stop();
  }, []);

  return <div ref={element} className="app-startup page-entry-visual" data-variant="nneo-rising-fill"
    data-exit-duration="800" role="status" aria-label="Todo listo" />;
}
