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

export const HomePage = () => {
  const { loading, isAuthenticated, user, logout } = useAuth();
  useHomeReveal(`${loading}-${isAuthenticated}`);

  if (loading) return null;

  return (
    <div className={`public-home public-home--${isAuthenticated ? "member" : "guest"}`}>
      <HomeHeader isAuthenticated={isAuthenticated} isAdmin={isAdminRole(user?.rol)}
        isSuperAdmin={user?.rol === "SUPER_ADMIN"} user={user} onLogout={() => void logout()} />
      <main className={isAuthenticated ? "public-home__authenticated" : undefined}>
        {!isAuthenticated && <HomeHero />}
        <HomeInstallGuide />
        {isAuthenticated ? <HomeCommunity /> : <HomeFeatures />}
      </main>
      <AppFooter showLogin={!isAuthenticated} />
    </div>
  );
};
