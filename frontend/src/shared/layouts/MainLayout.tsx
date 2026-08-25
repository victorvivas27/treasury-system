import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/layouts/sidebar/Sidebar";
import "./MainLayout.css";
import { useSidebarBehavior } from "@/presentation/hooks/sidebar/useSidebarBehavior";
import { ManagedCourseBanner } from "./ManagedCourseBanner";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { AppTour } from "@/shared/ui/apptour/AppTour";
import { HomeFooter } from "@/presentation/pages/home/components/HomeFooter";



export const MainLayout = () => {
const { isSidebarOpen, isLocked, onToggleSidebar, onNavLinkClick } = useSidebarBehavior();
const auth = useOptionalAuth();

  return (
    <main className="main-layout">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isLocked={isLocked}
        onToggleSidebar={onToggleSidebar}
        onNavLinkClick={onNavLinkClick}
      />
      <section className={`main-content ${!isSidebarOpen ? "sidebar-collapsed" : ""}`}>
        <ManagedCourseBanner />
        <Outlet />
        <HomeFooter reveal={false} />
      </section>
      {auth?.user && <AppTour user={auth.user} />}
    </main>
  );
};


