import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/layouts/sidebar/Sidebar";
import "./MainLayout.css";
import { useState } from "react";


export const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const onToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <section className={`sidebar-layout ${!isSidebarOpen ? "collapsed" : ""}`}>
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />
      <main className="outlet-layout">
        <Outlet />
      </main>
    </section>
  );
};


