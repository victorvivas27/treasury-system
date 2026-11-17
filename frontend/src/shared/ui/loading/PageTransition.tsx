import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import './PageTransition.css';
import { usePageAssetsReady } from './usePageAssetsReady';

const PageLoadingContext = createContext<((id: string, pending: boolean) => void) | null>(null);

// Readiness is consumed by the single boot cover, never by a navigation overlay.
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
  const assetsPending = usePageAssetsReady(content, booting);
  const report = useCallback((id: string, loading: boolean) => {
    if (loading) pending.current.add(id); else pending.current.delete(id);
    setDataPending(pending.current.size > 0);
  }, []);
  const preparing = dataPending || assetsPending;
  return <PageLoadingContext.Provider value={report}>
    <div ref={content} className="page-transition-content" aria-busy={preparing}
      data-page-assets-pending={booting && preparing || undefined}>
      {children}
    </div>
  </PageLoadingContext.Provider>;
}

export function PageTransitionOutlet() {
  const { pathname } = useLocation();
  return <PageTransitionBoundary key={pathname}><Outlet /></PageTransitionBoundary>;
}
