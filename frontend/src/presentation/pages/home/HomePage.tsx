import { HomeFeatures } from "./components/HomeFeatures";
import { HomeFooter } from "./components/HomeFooter";
import { HomeHeader } from "./components/HomeHeader";
import { HomeHero } from "./components/HomeHero";
import { HomeInstallGuide } from "./components/HomeInstallGuide";
import { useHomeReveal } from "./hooks/useHomeReveal";
import "./style/HomePage.css";

export const HomePage = () => {
  useHomeReveal();
  const { token, loading, isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (loading && token) return <LoadingState mesage="Recuperando tu sesión..." />;

  return (
    <div className="public-home">
      <HomeHeader />
      <main>
        <HomeInstallGuide />
        <HomeHero />
        <HomeFeatures />
      </main>
      <HomeFooter />
    </div>
  );
};
import { Navigate } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { LoadingState } from "@/shared/ui/loading/LoadingState";
