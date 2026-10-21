import { useEffect, useSyncExternalStore } from "react";
import { AppFooter } from "@/shared/ui/footer/AppFooter";
import { HomeHeader } from "./components/HomeHeader";
import { HomeHero } from "./components/HomeHero";
import { HomeInstallGuide } from "./components/HomeInstallGuide";
import { HomeCommunity } from "./components/HomeCommunity";
import { HomeFeatures } from "./components/HomeFeatures";
import { useHomeReveal } from "./hooks/useHomeReveal";
import "./style/HomePage.css";
import { useAuth } from "@/presentation/context/AuthContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { homeCommunityCache } from "./hooks/homeCommunityCache";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { LoadingState } from "@/shared/ui/loading/LoadingState";

export const HomePage = () => {
  const { loading, isAuthenticated, user, logout } = useAuth();
  const { ready, detailsReady, error } = useSyncExternalStore(homeCommunityCache.subscribe, homeCommunityCache.getSnapshot);
  const preparing = isAuthenticated && !ready && !error;
  useEffect(() => {
    if (!loading && isAuthenticated) void homeCommunityCache.load();
  }, [loading, isAuthenticated]);
  useHomeReveal(`${loading}-${isAuthenticated}-${detailsReady}`);

  if (loading) return null;
  if (isAuthenticated && !ready && error) return <main className="home-entry-error" role="alert">
    <FeedbackState title="No pudimos abrir el inicio" message={error}
      actionText="Reintentar" onRefresh={() => void homeCommunityCache.load()} /></main>;

  return (
    <>
    <div className={`public-home public-home--${isAuthenticated ? "member" : "guest"}`}
      inert={preparing} aria-busy={preparing}>
      <HomeHeader isAuthenticated={isAuthenticated} isAdmin={isAdminRole(user?.rol)}
        isSuperAdmin={user?.rol === "SUPER_ADMIN"} user={user} onLogout={() => void logout()} />
      <main className={isAuthenticated ? "public-home__authenticated" : undefined}>
        {!isAuthenticated && <HomeHero />}
        {isAuthenticated && <HomeInstallGuide />}
        {isAuthenticated ? detailsReady && <HomeCommunity /> : <HomeFeatures />}
      </main>
      <AppFooter showLogin={!isAuthenticated} />
    </div>
    {preparing && <LoadingState message="Preparando tu inicio" />}
    </>
  );
};
