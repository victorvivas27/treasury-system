
import { IoIosArrowBack } from "react-icons/io";
import { IoBulbOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import { Tooltip } from "@/shared/ui/tooltip/Tooltip";
import { OPEN_IMPROVEMENT_CENTER_EVENT } from "@/presentation/context/improvement/ImprovementCenterEvents";
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
        className={`sidebar-btn-arrow ${isLocked ? "is-pinned" : ""}`}
        aria-label="Toggle sidebar"
        aria-pressed={isLocked}
      >
        <span className="sidebar-btn-arrow-glow" aria-hidden="true" />
        <IoIosArrowBack className="sidebar-btn-arrow-icon" aria-hidden="true" />
        <Tooltip content={isLocked ? "Cerrar menú" : "Abrir menú"} position="right"
          className="sidebar-icon-tooltip" />
      </button>

      <Link className="sidebar-brand-header" to="/" aria-label="Ir a la página de inicio">
        <BrandLogo className="sidebar-brand-icon" />
        <span className="sidebar-brand-name">Home</span>
        <Tooltip content="Inicio" position="right" className="sidebar-icon-tooltip" />
      </Link>

      <button type="button" className="sidebar-improvement-button"
        aria-label="Centro de Mejoras"
        onClick={() => window.dispatchEvent(new Event(OPEN_IMPROVEMENT_CENTER_EVENT))}>
        <IoBulbOutline aria-hidden="true" />
        <span>Mejoras</span>
        <Tooltip content="Centro de Mejoras" position="right" className="sidebar-icon-tooltip" />
      </button>
    </>
  );
};

