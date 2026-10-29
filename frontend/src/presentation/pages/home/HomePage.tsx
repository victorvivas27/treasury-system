import { useEffect, useSyncExternalStore } from "react";
import { AppFooter } from "@/shared/ui/footer/AppFooter";
import { HomeHeader } from "./components/HomeHeader";
import { HomeHero } from "./components/HomeHero";
import { HomeCommunity } from "./components/HomeCommunity";
import { HomeWelcome } from "./components/HomeWelcome";
import { HomeFeatures } from "./components/HomeFeatures";
import { useHomeReveal } from "./hooks/useHomeReveal";
import "./style/HomePage.css";
import { useAuth } from "@/presentation/context/AuthContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { homeCommunityCache } from "./hooks/homeCommunityCache";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { HomeCommunitySkeleton } from "./components/HomeCommunitySkeleton";

export const HomePage = () => {
  const { loading, isAuthenticated, user, logout } = useAuth();
  const { ready, detailsReady, error } = useSyncExternalStore(homeCommunityCache.subscribe, homeCommunityCache.getSnapshot);
  const preparing = isAuthenticated && !ready && !error;
  useEffect(() => {
    if (!loading && isAuthenticated) void homeCommunityCache.load();
  }, [loading, isAuthenticated]);
  useHomeReveal(`${loading}-${isAuthenticated}-${detailsReady}`);

  if (isAuthenticated && !ready && error) return <main className="home-entry-error" role="alert">
    <FeedbackState title="No pudimos abrir el inicio" message={error}
      actionText="Reintentar" onRefresh={() => void homeCommunityCache.load()} /></main>;

  return (
    <>
    <div className={`public-home public-home--${isAuthenticated ? "member" : "guest"}`}
      aria-busy={preparing}>
      <HomeHeader isAuthenticated={isAuthenticated} isAdmin={isAdminRole(user?.rol)}
        isSuperAdmin={user?.rol === "SUPER_ADMIN"} user={user} onLogout={() => void logout()} />
      <main className={isAuthenticated ? "public-home__authenticated" : undefined}>
        {!isAuthenticated && <HomeHero />}
        {isAuthenticated && <HomeWelcome />}
        {isAuthenticated ? detailsReady ? <HomeCommunity /> : <HomeCommunitySkeleton /> : <HomeFeatures />}
      </main>
      <AppFooter showLogin={!isAuthenticated} />
    </div>
    </>
  );
};
