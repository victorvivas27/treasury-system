import { HomeFeatures } from "./components/HomeFeatures";
import { HomeFooter } from "./components/HomeFooter";
import { HomeHeader } from "./components/HomeHeader";
import { HomeHero } from "./components/HomeHero";
import { HomeInstallGuide } from "./components/HomeInstallGuide";
import { HomeCommunity } from "./components/HomeCommunity";
import { useHomeReveal } from "./hooks/useHomeReveal";
import "./style/HomePage.css";
import { useAuth } from "@/presentation/context/AuthContext";
import { LoadingState } from "@/shared/ui/loading/LoadingState";

export const HomePage = () => {
  useHomeReveal();
  const { token, loading, isAuthenticated, user, logout } = useAuth();

  if (loading && token) return <LoadingState mesage="Recuperando tu sesión..." />;

  return (
    <div className="public-home">
      <HomeHeader isAuthenticated={isAuthenticated} isAdmin={user?.rol === "ADMIN"}
        user={user} onLogout={() => void logout()} />
      <main>
        <HomeInstallGuide />
        <HomeHero isAuthenticated={isAuthenticated} />
        <HomeFeatures />
        {isAuthenticated && <HomeCommunity />}
      </main>
      <HomeFooter />
    </div>
  );
};
