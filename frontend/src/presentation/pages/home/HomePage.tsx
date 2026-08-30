import { HomeFooter } from "./components/HomeFooter";
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
  const { token, loading, isAuthenticated, user, logout } = useAuth();
  useHomeReveal(`${loading}-${isAuthenticated}`);

  if (loading && token) return null;

  return (
    <div className="public-home">
      <HomeHeader isAuthenticated={isAuthenticated} isAdmin={isAdminRole(user?.rol)}
        isSuperAdmin={user?.rol === "SUPER_ADMIN"} user={user} onLogout={() => void logout()} />
      <main>
        {isAuthenticated ? <>
          <HomeInstallGuide />
          <HomeCommunity />
        </> : <>
          <HomeHero />
          <HomeFeatures />
        </>}
      </main>
      <HomeFooter />
    </div>
  );
};
