import { lockBodyScroll } from "@/shared/ui/dialog/scrollLock";
import { useCallback, useEffect, useState } from "react";

export type SidebarState = "hidden" | "icons" | "expanded";
const mobileQuery = "(max-width: 768px)";
const isMobileViewport = () => window.matchMedia(mobileQuery).matches;

export const useSidebarBehavior = () => {
  const [mobile, setMobile] = useState(isMobileViewport);
  const [sidebarState, setSidebarState] = useState<SidebarState>(() =>
    isMobileViewport() ? "hidden" : "icons");

  useEffect(() => {
    const media = window.matchMedia(mobileQuery);
    const update = () => {
      setMobile(media.matches);
      setSidebarState(media.matches ? "hidden" : "icons");
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarState(mobile ? "hidden" : "icons");
  }, [mobile]);

  useEffect(() => {
    if (mobile || sidebarState !== "expanded") return;
    const closeAfterLeaving = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const bounds = document.getElementById("app-sidebar")?.getBoundingClientRect();
      if (bounds && (event.clientX < bounds.left || event.clientX >= bounds.right ||
          event.clientY < bounds.top || event.clientY >= bounds.bottom)) closeSidebar();
    };
    document.addEventListener("pointermove", closeAfterLeaving);
    return () => document.removeEventListener("pointermove", closeAfterLeaving);
  }, [mobile, sidebarState, closeSidebar]);

  useEffect(() => {
    if (!mobile || sidebarState !== "expanded") return;
    const unlockScroll = lockBodyScroll();
    const toggle = document.querySelector<HTMLButtonElement>(".sidebar-state-toggle");
    const sidebar = document.getElementById("app-sidebar");
    sidebar?.querySelector<HTMLElement>("a, button")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarState("hidden");
        toggle?.focus();
      }
      if (event.key === "Tab" && sidebar && toggle) {
        const controls = [toggle, ...Array.from(sidebar.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"))];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      unlockScroll();
      document.removeEventListener("keydown", escape);
    };
  }, [mobile, sidebarState]);

  const onToggleSidebar = useCallback(() => {
    setSidebarState(current => current === "expanded" ? (mobile ? "hidden" : "icons") : "expanded");
  }, [mobile]);

  return {
    sidebarState,
    isMobile: mobile,
    isSidebarOpen: sidebarState === "expanded",
    isLocked: sidebarState === "expanded",
    onToggleSidebar,
    onNavLinkClick: () => { if (mobile) closeSidebar(); },
    closeSidebar,
  };
};
