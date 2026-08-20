
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
        className="sidebar-btn-arrow"
        aria-label="Toggle sidebar"
        style={{
          backgroundColor: isLocked ? "var(--color-warning)" : "var(--color-primary)",
        }}
      >
        <IoIosArrowBack className="sidebar-btn-arrow-icon" />
      </button>

      <Link className="sidebar-brand-header" to="/" aria-label="Ir a la página de inicio">
        <BrandLogo className="sidebar-brand-icon" />
        <span className="sidebar-brand-name">Sistema de Tesorería</span>
      </Link>
    </>
  );
};

