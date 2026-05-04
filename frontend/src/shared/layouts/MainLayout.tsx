import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/layouts/sidebar/Sidebar";
import "./MainLayout.css";
import { useState } from "react";


export const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const onToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <main className="main-layout">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />
      <section className={`main-content ${!isSidebarOpen ? "sidebar-collapsed" : ""}`}>
        <Outlet />
      </section>
    </main>
  );
};


