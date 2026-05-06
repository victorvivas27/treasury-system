import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/layouts/sidebar/Sidebar";
import "./MainLayout.css";
import { useRef, useState } from "react";


export const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const timeoutRef = useRef< number | null>(null);

  const onToggleSidebar = () => {
    // Limpiar timeout si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Toggle del locked state (flecha controla esto)
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    setIsSidebarOpen(newLocked);
  };

  const onNavLinkClick = () => {
    // Si está bloqueado por flecha, no hacer nada
    if (isLocked) return;

    // Abrir sidebar
    setIsSidebarOpen(true);

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cerrar después de 3 segundos
    timeoutRef.current = setTimeout(() => {
      setIsSidebarOpen(false);
      timeoutRef.current = null;
    }, 1000);
  };

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


