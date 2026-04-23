import "./style/Sidebar.css";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooter } from "./SidebarFooter";
import type { FC } from "react";
//import { SidebarSearch } from "./SidebarSearch";

interface SidebarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}
export const Sidebar: FC<SidebarProps> = ({ isSidebarOpen, onToggleSidebar }) => {
  return (
    <aside className={`sidebar ${!isSidebarOpen ? "sidebar--collapsed" : ""}`}>
      <SidebarHeader onToggleSidebar={onToggleSidebar} />
      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
};
