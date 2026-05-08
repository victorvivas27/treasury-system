
import { IoIosArrowBack } from "react-icons/io";
const icono_tesoreria = ("/icono_tesoreria_03.png");
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
          src={icono_tesoreria}
          alt="Tesorería"
        />
        <span className="sidebar-brand-name">Tesorería</span>
      </header>
    </>
  );
};

