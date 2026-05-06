import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/layouts/sidebar/Sidebar";
import "./MainLayout.css";
import { useSidebarBehavior } from "@/presentation/hooks/sidebar/useSidebarBehavior";



export const MainLayout = () => {
 const { isSidebarOpen, isLocked, onToggleSidebar, onNavLinkClick } = useSidebarBehavior();

  return (
    <main className="main-layout">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isLocked={isLocked}
        onToggleSidebar={onToggleSidebar}
        onNavLinkClick={onNavLinkClick}
      />
      <section className={`main-content ${!isSidebarOpen ? "sidebar-collapsed" : ""}`}>
        <Outlet />
      </section>
    </main>
  );
};


