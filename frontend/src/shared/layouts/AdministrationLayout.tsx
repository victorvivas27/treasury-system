import { Outlet } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { HomeHeader } from "@/presentation/pages/home/components/HomeHeader";
import { AppFooter } from "@/shared/ui/footer/AppFooter";
import "@/presentation/pages/home/style/HomePage.css";
import "./AdministrationLayout.css";

export const AdministrationLayout = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  if (loading) return null;
  return <div className="public-home public-home--member administration-layout">
    <HomeHeader isAuthenticated={isAuthenticated} isAdmin={isAdminRole(user?.rol)}
      isSuperAdmin={user?.rol === "SUPER_ADMIN"} user={user} showCommunityLinks={false}
      onLogout={() => void logout()} />
    <main className="administration-layout__content"><Outlet /></main>
    <AppFooter />
  </div>;
};
