import { getCachedLoaderPreference } from '@/shared/ui/loading/loaderPreferenceCache';
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageEntryVisual } from './PageEntryVisual';
import './PageTransition.css';
import { usePageAssetsReady } from './usePageAssetsReady';
import { readPageTransitionPreferences } from './pageTransitionPreferences';

const PageLoadingContext = createContext<((id: string, pending: boolean, failed?: boolean) => void) | null>(null);

// Pages report their initial data state explicitly; saves and background refreshes do not block navigation.
export function usePageEntry(pending: boolean | undefined, error?: unknown) {
  const report = useContext(PageLoadingContext);
  const id = useId();
  useLayoutEffect(() => {
    report?.(id, Boolean(pending && !error), Boolean(error));
    return () => report?.(id, false);
  }, [id, report, pending, error]);
}

export function PageTransitionBoundary({ children, animateOnEntry = false }: { children: ReactNode; animateOnEntry?: boolean }) {
  const content = useRef<HTMLDivElement>(null);
  const pending = useRef(new Set<string>());
  const completed = useRef(false);
  const opened = useRef(false);
  const [state, setState] = useState({ visible: animateOnEntry, ready: true });
  const assetsPending = usePageAssetsReady(content, !completed.current);
  useLayoutEffect(() => {
    if (!assetsPending || completed.current) return;
    opened.current = true;
    setState(current => current.visible ? current : { ...current, visible: true });
  }, [assetsPending]);
  const visible = state.visible || (!completed.current && assetsPending);
  const ready = state.ready && !assetsPending;
  const [preferences] = useState(readPageTransitionPreferences);
  const [skipEntryVisual] = useState(() => Boolean(document.getElementById('app-boot-loader')) || !getCachedLoaderPreference('pageTransition'));
  const report = useCallback((id: string, loading: boolean, failed = false) => {
    if (completed.current) return;
    if (failed) {
      completed.current = true;
      setState({ visible: false, ready: true });
      return;
    }
    if (loading) { pending.current.add(id); opened.current = true; } else pending.current.delete(id);
    setState(current => {
      const ready = pending.current.size === 0;
      const visible = current.visible || !ready;
      return current.ready === ready && current.visible === visible ? current : { visible, ready };
    });
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { if (!opened.current && !assetsPending) completed.current = true; });
    return () => cancelAnimationFrame(frame);
  }, [assetsPending]);
  const finish = useCallback(() => {
    completed.current = true;
    setState({ visible: false, ready: true });
  }, []);
  useEffect(() => {
    // Release the page once data settles when boot covers it or no admin loader is available.
    if (skipEntryVisual && visible && ready) finish();
  }, [skipEntryVisual, visible, ready, finish]);
  return <PageLoadingContext.Provider value={report}>
    {visible && !skipEntryVisual && <PageEntryVisual ready={ready} onExited={finish} preferences={preferences} />}
    <div ref={content} className="page-transition-content" inert={visible} aria-hidden={visible || undefined} aria-busy={!ready}>
      {children}
    </div>
  </PageLoadingContext.Provider>;
}

export function PageTransitionOutlet() {
  const { pathname } = useLocation();
  return <PageTransitionBoundary key={pathname}><Outlet /></PageTransitionBoundary>;
}
