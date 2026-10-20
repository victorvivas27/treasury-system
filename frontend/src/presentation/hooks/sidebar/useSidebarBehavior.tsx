import { useCallback, useEffect, useRef, useState } from "react";

export type SidebarState = "hidden" | "icons" | "expanded";

export const useSidebarBehavior = () => {
  const [sidebarState, setSidebarState] = useState<SidebarState>("hidden");
  const pointerInside = useRef(false);
  useEffect(() => {
    if (sidebarState === "hidden") {
      pointerInside.current = false;
      return;
    }
    const checkPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !pointerInside.current) return;
      if (event.target instanceof Element && event.target.closest("#app-sidebar, .sidebar-state-toggle")) return;
      pointerInside.current = false;
      setSidebarState("hidden");
    };
    document.addEventListener("pointermove", checkPointer);
    return () => document.removeEventListener("pointermove", checkPointer);
  }, [sidebarState]);
  const onSidebarPointerEnter = useCallback(() => {
    pointerInside.current = true;
  }, []);
  const onSidebarPointerLeave = useCallback(() => {
    pointerInside.current = false;
    setSidebarState("hidden");
  }, []);
  const onSidebarFocus = useCallback(() => {
    setSidebarState(current => current === "hidden" ? "icons" : current);
  }, []);
  const onSidebarBlur = useCallback(() => {
    if (!pointerInside.current) setSidebarState("hidden");
  }, []);
  const onNavLinkClick = useCallback(() => {
    if (!pointerInside.current) setSidebarState("hidden");
  }, []);
  const onToggleSidebar = useCallback(() => {
    setSidebarState(current => current === "hidden" ? "icons"
      : current === "icons" ? "expanded" : "hidden");
  }, []);

  return {
    sidebarState,
    isSidebarOpen: sidebarState === "expanded",
    isLocked: sidebarState === "expanded",
    onToggleSidebar,
    onNavLinkClick,
    onSidebarPointerEnter,
    onSidebarPointerLeave,
    onSidebarFocus,
    onSidebarBlur,
  };
};
