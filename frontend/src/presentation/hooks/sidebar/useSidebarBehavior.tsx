import { useCallback, useState } from "react";

export const useSidebarBehavior = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const onToggleSidebar = useCallback(() => {
    const nextOpen = !isSidebarOpen;
    setIsSidebarOpen(nextOpen);
    setIsLocked(nextOpen);
  }, [isSidebarOpen]);

  const onNavLinkClick = useCallback(() => {
    // Navegar no modifica el sidebar. Solo la flecha controla su apertura.
  }, []);

  return {
    isSidebarOpen,
    isLocked,
    onToggleSidebar,
    onNavLinkClick,
  };
};
