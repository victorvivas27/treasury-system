import "./style/Sidebar.css";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooter } from "./SidebarFooter";
//import { SidebarSearch } from "./SidebarSearch";

interface SidebarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}
export const Sidebar = ({ isSidebarOpen, onToggleSidebar }: SidebarProps) => {
  return (
    <aside className={`sidebar ${!isSidebarOpen ? "sidebar--collapsed" : ""}`}>
      <SidebarHeader onToggleSidebar={onToggleSidebar} />
      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
};
