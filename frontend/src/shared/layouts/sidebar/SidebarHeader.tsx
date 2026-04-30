
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
        className="sidebar-btn-arrow flex-center"
        aria-label="Toggle sidebar"
      >
        <IoIosArrowBack className="font-lg" />
      </button>

      <header className="sidebar-brand-header flex-align-center gap-sm">
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
