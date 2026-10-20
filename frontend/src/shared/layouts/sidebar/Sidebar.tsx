import "./style/Sidebar.css";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooter } from "./SidebarFooter";
import { IoIosArrowBack } from "react-icons/io";
import { Tooltip } from "@/shared/ui/tooltip/Tooltip";
import type { FC, ReactNode } from "react";


interface SidebarProps {
  headerContent?: ReactNode;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isSidebarOpen: boolean;
  isHidden?: boolean;
  isLocked: boolean;
  onToggleSidebar: () => void;
  onNavLinkClick: () => void;
}
export const Sidebar: FC<SidebarProps> = ({ headerContent, onPointerEnter, onPointerLeave, onFocus, onBlur, isSidebarOpen, isHidden = false, isLocked, onToggleSidebar, onNavLinkClick }) => {
  const nextAction = isHidden ? "Mostrar iconos del menú" : isSidebarOpen ? "Ocultar menú" : "Abrir menú completo";
  return (<>
    <div className="sidebar-control-bar">
    <button type="button" onClick={onToggleSidebar}
      className={`sidebar-btn-arrow sidebar-state-toggle ${isLocked ? "is-pinned" : ""} ${isHidden ? "is-hidden" : isSidebarOpen ? "is-expanded" : "is-icons"}`}
      aria-label={`Toggle sidebar: ${nextAction}`} aria-controls="app-sidebar"
      aria-expanded={!isHidden} aria-pressed={isLocked}>
      <span className="sidebar-btn-arrow-glow" aria-hidden="true" />
      <IoIosArrowBack className="sidebar-btn-arrow-icon" aria-hidden="true" />
      <Tooltip content={nextAction} position="right" className="sidebar-icon-tooltip" />
    </button>
    <span className="sidebar-control-label" aria-hidden="true">Menú</span>
    {headerContent}
    </div>
    <aside onPointerEnter={event => { if (event.pointerType === "mouse") onPointerEnter?.(); }}
      onPointerLeave={event => {
        if (event.pointerType === "mouse" && !(event.relatedTarget instanceof Element && event.relatedTarget.closest(".sidebar-state-toggle"))) onPointerLeave?.();
      }}
      onFocus={onFocus}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.(); }}
      id="app-sidebar" aria-label="Menú principal" inert={isHidden} aria-hidden={isHidden}
      data-state={isHidden ? "hidden" : isSidebarOpen ? "expanded" : "icons"} className={`sidebar flex-col ${!isSidebarOpen ? "sidebar--collapsed" : ""}`}>
      <SidebarHeader
        showToggle={false}
        isLocked={isLocked}
        isCollapsed={!isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />
      <SidebarNav onNavLinkClick={onNavLinkClick} isCollapsed={!isSidebarOpen} />
      <SidebarFooter onNavLinkClick={onNavLinkClick} isCollapsed={!isSidebarOpen} />
    </aside>
  </>);
};
