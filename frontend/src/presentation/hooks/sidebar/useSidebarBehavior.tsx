import { useCallback, useRef, useState } from "react";

export const useSidebarBehavior = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const onToggleSidebar = useCallback(() => {
    // Limpiar timeout si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
// Toggle del locked state (flecha controla esto)
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    setIsSidebarOpen(newLocked);
  }, [isLocked]);

  const onNavLinkClick = useCallback(() => {
  // Si está bloqueado por flecha, no hacer nada
    if (isLocked) return;
// Abrir sidebar
    setIsSidebarOpen(true);
// Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
// Cerrar después de 1 segundo
    timeoutRef.current = setTimeout(() => {
      setIsSidebarOpen(false);
      timeoutRef.current = null;
    }, 1000);
  }, [isLocked]);

  return {
    isSidebarOpen,
    isLocked,
    onToggleSidebar,
    onNavLinkClick,
  };
};
