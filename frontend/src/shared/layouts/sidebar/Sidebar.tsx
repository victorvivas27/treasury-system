import "./style/Sidebar.css";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooter } from "./SidebarFooter";
import { FiMenu, FiSidebar, FiX } from "react-icons/fi";
import { Tooltip } from "@/shared/ui/tooltip/Tooltip";
import type { FC, ReactNode } from "react";


interface SidebarProps {
  headerContent?: ReactNode;
  onCloseSidebar?: () => void;
  isSidebarOpen: boolean;
  isHidden?: boolean;
  isLocked: boolean;
  onToggleSidebar: () => void;
  onNavLinkClick: () => void;
}
export const Sidebar: FC<SidebarProps> = ({ headerContent, onCloseSidebar, isSidebarOpen, isHidden = false, isLocked, onToggleSidebar, onNavLinkClick }) => {
  const nextAction = isHidden ? "Abrir menú" : isSidebarOpen ? "Contraer menú" : "Ampliar menú";
  return (<>
    <div className="sidebar-control-bar">
    <button type="button" onClick={onToggleSidebar}
      className={`sidebar-btn-arrow sidebar-state-toggle ${isLocked ? "is-pinned" : ""} ${isHidden ? "is-hidden" : isSidebarOpen ? "is-expanded" : "is-icons"}`}
      aria-label={nextAction} aria-controls="app-sidebar"
      aria-expanded={isSidebarOpen}>
      <FiSidebar className="sidebar-toggle-desktop" aria-hidden="true" />
      {isSidebarOpen ? <FiX className="sidebar-toggle-mobile" aria-hidden="true" /> : <FiMenu className="sidebar-toggle-mobile" aria-hidden="true" />}
      <Tooltip content={nextAction} position="right" className="sidebar-icon-tooltip" />
    </button>
    <span className="sidebar-control-label" aria-hidden="true">Menú</span>
    {headerContent}
    </div>
    {isSidebarOpen && <button className="sidebar-backdrop" type="button" tabIndex={-1} aria-label="Cerrar menú" onClick={onCloseSidebar ?? onToggleSidebar} />}
    <aside
      id="app-sidebar" aria-label="Menú principal" inert={isHidden} aria-hidden={isHidden}
      data-state={isHidden ? "hidden" : isSidebarOpen ? "expanded" : "icons"} className={`sidebar flex-col ${!isSidebarOpen ? "sidebar--collapsed" : ""}`}>
      <SidebarHeader isCollapsed={!isSidebarOpen} />
      <SidebarNav onNavLinkClick={onNavLinkClick} isCollapsed={!isSidebarOpen} onExpandSidebar={onToggleSidebar} />
      <SidebarFooter onNavLinkClick={onNavLinkClick} isCollapsed={!isSidebarOpen} />
    </aside>
  </>);
};
