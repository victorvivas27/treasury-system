import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import './PageTransition.css';
import { usePageAssetsReady } from './usePageAssetsReady';

const PageLoadingContext = createContext<((id: string, pending: boolean) => void) | null>(null);

// Pages report their initial data readiness to the nearest route boundary.
export function usePageEntry(pending: boolean | undefined, error?: unknown) {
  const report = useContext(PageLoadingContext);
  const id = useId();
  useLayoutEffect(() => {
    report?.(id, Boolean(pending && !error));
    return () => report?.(id, false);
  }, [id, report, pending, error]);
}

export function PageTransitionBoundary({ children }: { children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  const pending = useRef(new Set<string>());
  const [booting, setBooting] = useState(() => Boolean(document.getElementById('app-boot-loader')));
  useEffect(() => {
    if (!booting) return;
    const observer = new MutationObserver(() => {
      if (!document.getElementById('app-boot-loader')) setBooting(false);
    });
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, [booting]);
  const [dataPending, setDataPending] = useState(false);
  const [phase, setPhase] = useState<'initial' | 'waiting' | 'leaving' | 'done'>('initial');
  const assetsPending = usePageAssetsReady(content, booting);
  const report = useCallback((id: string, loading: boolean) => {
    if (loading) pending.current.add(id); else pending.current.delete(id);
    setDataPending(pending.current.size > 0);
  }, []);
  const preparing = dataPending || assetsPending;
  useEffect(() => {
    if (booting) return;
    if (phase === 'initial') {
      const timer = window.setTimeout(() => setPhase(dataPending ? 'waiting' : 'done'), 0);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'waiting' && !dataPending) setPhase('leaving');
    if (phase === 'leaving') {
      const timer = window.setTimeout(() => setPhase('done'), 800);
      return () => window.clearTimeout(timer);
    }
  }, [booting, dataPending, phase]);
  const waiting = !booting && phase === 'waiting';
  const leaving = !booting && phase === 'leaving';
  return <PageLoadingContext.Provider value={report}>
    <div className={`page-load-stage${waiting || leaving ? ' is-active' : ''}`}>
    {(waiting || leaving) && <div className={`page-load-balls${leaving ? ' is-leaving' : ''}`} role="status" aria-label="Cargando datos">
      {Array.from({ length: 6 }, (_, index) => <span key={index} className={`page-load-ball ball-${index + 1}`} aria-hidden="true" />)}
    </div>}
    <div ref={content} className={`page-transition-content${waiting ? ' is-waiting' : ''}${leaving ? ' is-arriving' : ''}`} aria-busy={preparing}
      data-page-assets-pending={booting && preparing || undefined}>
      {children}
    </div>
    </div>
  </PageLoadingContext.Provider>;
}

export function PageTransitionOutlet() {
  const { pathname } = useLocation();
  return <PageTransitionBoundary key={pathname}><Outlet /></PageTransitionBoundary>;
}
