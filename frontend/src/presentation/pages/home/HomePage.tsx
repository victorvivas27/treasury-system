import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePageAssetsReady } from '@/shared/ui/loading/usePageAssetsReady';
import { AppFooter } from "@/shared/ui/footer/AppFooter";
import { HomeHeader } from "./components/HomeHeader";
import { HomeEditorial } from "./components/HomeEditorial";
import { HomeCommunity } from "./components/HomeCommunity";
import { HomeWelcome } from "./components/HomeWelcome";
import { useHomeReveal } from "./hooks/useHomeReveal";
import "./style/HomePage.css";
import "./style/HomeMember.css";
import { useAuth } from "@/presentation/context/AuthContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { homeCommunityCache } from "./hooks/homeCommunityCache";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { HomeEntryTransition } from "./components/HomeEntryTransition";
import { homeCourseCache } from "./hooks/homeCourseCache";


export const HomePage = () => {
  const content = useRef<HTMLDivElement>(null);
  const [assetsRevealed, setAssetsRevealed] = useState(false);
  const assetsPending = usePageAssetsReady(content, !assetsRevealed);
  const { loading, isAuthenticated, user, logout } = useAuth();
  const { ready, detailsReady, error } = useSyncExternalStore(homeCommunityCache.subscribe, homeCommunityCache.getSnapshot);
  const preparing = isAuthenticated && !ready && !error;
  const [courseReady, setCourseReady] = useState(() => homeCourseCache.peek() !== undefined);
  const [revealed, setRevealed] = useState(() => ready && homeCourseCache.peek() !== undefined);
  const markCourseReady = useCallback(() => setCourseReady(true), []);
  const revealHome = useCallback(() => setRevealed(true), []);
  useEffect(() => {
    if (assetsPending || (isAuthenticated && !revealed)) return;
    const frame = requestAnimationFrame(() => setAssetsRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, [assetsPending, isAuthenticated, revealed]);
  useEffect(() => {
    if (!isAuthenticated) { setRevealed(false); setCourseReady(false); }
  }, [isAuthenticated]);
  useEffect(() => {
    if (!loading && isAuthenticated) void homeCommunityCache.load();
  }, [loading, isAuthenticated]);
  useHomeReveal(`${loading}-${isAuthenticated}-${detailsReady}`);

  if (isAuthenticated && !ready && error) return <main className="home-entry-error" role="alert">
    <FeedbackState title="No pudimos abrir el inicio" message={error}
      actionText="Reintentar" onRefresh={() => void homeCommunityCache.load()} /></main>;

  return (
    <>
    {isAuthenticated && !revealed && <HomeEntryTransition ready={ready && courseReady && !assetsPending} onExited={revealHome} />}
    <div ref={content} data-page-assets-pending={assetsPending || undefined} className={`public-home public-home--${isAuthenticated ? "member" : "guest public-home--editorial"}`}
      inert={assetsPending || (isAuthenticated && !revealed)}
      aria-hidden={isAuthenticated && !revealed ? true : undefined}
      aria-busy={preparing || assetsPending}>
      <HomeHeader isAuthenticated={isAuthenticated} isAdmin={isAdminRole(user?.rol)}
        isSuperAdmin={user?.rol === "SUPER_ADMIN"} user={user} onLogout={() => void logout()} />
      <main className={isAuthenticated ? "public-home__authenticated" : undefined}>
        {!isAuthenticated && <HomeEditorial />}
        {isAuthenticated && <HomeWelcome onReady={markCourseReady} animateReady={revealed} />}
        {isAuthenticated && detailsReady && <HomeCommunity />}
      </main>
      <AppFooter showLogin={!isAuthenticated} />
    </div>
    </>
  );
};
