import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/layouts/sidebar/Sidebar";
import "./MainLayout.css";
import { useSidebarBehavior } from "@/presentation/hooks/sidebar/useSidebarBehavior";
import { ManagedCourseBanner } from "./ManagedCourseBanner";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { AppFooter } from "@/shared/ui/footer/AppFooter";
import { ImprovementCenter } from "@/presentation/components/improvement-center/ImprovementCenter";



export const MainLayout = () => {
const { sidebarState, isSidebarOpen, isLocked, onToggleSidebar, onNavLinkClick,
  onSidebarPointerEnter, onSidebarPointerLeave, onSidebarFocus, onSidebarBlur } = useSidebarBehavior();
const auth = useOptionalAuth();

  return (
    <main className={`main-layout main-layout--sidebar-${sidebarState}`}>
      <Sidebar
        headerContent={<ManagedCourseBanner />}
        onPointerEnter={onSidebarPointerEnter}
        onPointerLeave={onSidebarPointerLeave}
        onFocus={onSidebarFocus}
        onBlur={onSidebarBlur}
        isHidden={sidebarState === "hidden"}
        isSidebarOpen={isSidebarOpen}
        isLocked={isLocked}
        onToggleSidebar={onToggleSidebar}
        onNavLinkClick={onNavLinkClick}
      />
      <section className={`main-content ${!isSidebarOpen ? "sidebar-collapsed" : ""}`}>
        <Outlet />
        <AppFooter />
      </section>
      {auth?.user && <ImprovementCenter />}
    </main>
  );
};


