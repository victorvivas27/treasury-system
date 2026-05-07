import "./style/Sidebar.css";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooter } from "./SidebarFooter";
import type { FC } from "react";


interface SidebarProps {
  isSidebarOpen: boolean;
  isLocked: boolean;
  onToggleSidebar: () => void;
  onNavLinkClick: () => void;
}
export const Sidebar: FC<SidebarProps> = ({ isSidebarOpen, isLocked, onToggleSidebar, onNavLinkClick }) => {
  return (
    <aside className={`sidebar flex-col ${!isSidebarOpen ? "sidebar--collapsed" : ""}`}>
      <SidebarHeader
        isLocked={isLocked}
        onToggleSidebar={onToggleSidebar}
      />
      <SidebarNav onNavLinkClick={onNavLinkClick}/>
      <SidebarFooter isSidebarOpen={isSidebarOpen}  />
    </aside>
  );
};
