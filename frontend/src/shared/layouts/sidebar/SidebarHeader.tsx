
import { IoIosArrowBack } from "react-icons/io";
const icono_tesoreria = ("/icono_tesoreria_03.png");
import "./style/SidebarHeader.css";
type SidebarHeaderProps = {
  onToggleSidebar: () => void;
};
export const SidebarHeader = ({ onToggleSidebar }: SidebarHeaderProps) => {
  return (
    <>
      <button
        onClick={onToggleSidebar}
        className="sidebar-btn-arrow"
        aria-label="Toggle sidebar"
      >
        <IoIosArrowBack className="sidebar-icon-arrow" />
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
