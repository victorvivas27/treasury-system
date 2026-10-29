import { MobileNavigation } from "./mobile/MobileNavigation";
import { RouteSuccessToast } from "@/shared/ui/modalalert/RouteSuccessToast";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/layouts/sidebar/Sidebar";
import "./MainLayout.css";
import { useSidebarBehavior } from "@/presentation/hooks/sidebar/useSidebarBehavior";
import { ManagedCourseBanner } from "./ManagedCourseBanner";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { AppFooter } from "@/shared/ui/footer/AppFooter";
import { ImprovementCenter } from "@/presentation/components/improvement-center/ImprovementCenter";



export const MainLayout = () => {
const { sidebarState, isMobile, isSidebarOpen, isLocked, onToggleSidebar, onNavLinkClick,
  closeSidebar } = useSidebarBehavior();
const auth = useOptionalAuth();

  return (
    <main className={`main-layout main-layout--sidebar-${sidebarState}`}>
      <Sidebar
        headerContent={<ManagedCourseBanner />}
        onCloseSidebar={closeSidebar}
        isHidden={sidebarState === "hidden"}
        isSidebarOpen={isSidebarOpen}
        isLocked={isLocked}
        onToggleSidebar={onToggleSidebar}
        onNavLinkClick={onNavLinkClick}
      />
      <section inert={isMobile && isSidebarOpen} className={`main-content ${!isSidebarOpen ? "sidebar-collapsed" : ""}`}>
        <Outlet />
        <AppFooter />
      </section>
      <RouteSuccessToast />
      {auth?.user && !isMobile && <ImprovementCenter />}
      <MobileNavigation />
    </main>
  );
};


