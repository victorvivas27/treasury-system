
import { IoIosArrowBack } from "react-icons/io";
const iconoTesoreria = "/Tesoreria.png";
import "./style/SidebarHeader.css";
type SidebarHeaderProps = {
  onToggleSidebar: () => void;
  isLocked: boolean;
};
export const SidebarHeader = ({ onToggleSidebar, isLocked }: SidebarHeaderProps) => {
  return (
    <>
      <button
        onClick={onToggleSidebar}
        className="sidebar-btn-arrow"
        aria-label="Toggle sidebar"
        style={{
          backgroundColor: isLocked ? "var(--color-warning)" : "var(--color-primary)",
        }}
      >
        <IoIosArrowBack className="sidebar-btn-arrow-icon" />
      </button>

      <header className="sidebar-brand-header">
        <img
          className="sidebar-brand-icon"
          src={iconoTesoreria}
          alt="Logo del Sistema de Tesorería"
        />
        <span className="sidebar-brand-name">Sistema de Tesorería</span>
      </header>
    </>
  );
};

