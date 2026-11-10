import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageEntryVisual } from './PageEntryVisual';
import './PageTransition.css';
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

export function PageTransitionBoundary({ children }: { children: ReactNode }) {
  const pending = useRef(new Set<string>());
  const completed = useRef(false);
  const opened = useRef(false);
  const [state, setState] = useState({ visible: false, ready: false });
  const [preferences] = useState(readPageTransitionPreferences);
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
    const frame = requestAnimationFrame(() => { if (!opened.current) completed.current = true; });
    return () => cancelAnimationFrame(frame);
  }, []);
  const finish = useCallback(() => {
    completed.current = true;
    setState({ visible: false, ready: true });
  }, []);
  return <PageLoadingContext.Provider value={report}>
    {state.visible && <PageEntryVisual ready={state.ready} onExited={finish} preferences={preferences} />}
    <div className="page-transition-content" inert={state.visible} aria-hidden={state.visible || undefined}>
      {children}
    </div>
  </PageLoadingContext.Provider>;
}

export function PageTransitionOutlet() {
  const { pathname } = useLocation();
  return <PageTransitionBoundary key={pathname}><Outlet /></PageTransitionBoundary>;
}
