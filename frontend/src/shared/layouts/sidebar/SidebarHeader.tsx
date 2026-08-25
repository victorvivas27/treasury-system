
import { IoIosArrowBack } from "react-icons/io";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
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
        title={isLocked ? "Cerrar menú lateral" : "Abrir y fijar menú lateral"}
      >
        <span className="sidebar-btn-arrow-glow" aria-hidden="true" />
        <IoIosArrowBack className="sidebar-btn-arrow-icon" aria-hidden="true" />
      </button>

      <Link className="sidebar-brand-header" to="/" aria-label="Ir a la página de inicio">
        <BrandLogo className="sidebar-brand-icon" />
        <span className="sidebar-brand-name">Home</span>
      </Link>
    </>
  );
};

