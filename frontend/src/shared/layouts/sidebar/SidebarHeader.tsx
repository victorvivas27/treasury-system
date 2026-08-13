
import { IoIosArrowBack } from "react-icons/io";
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

      <header className="sidebar-brand-header">
        <BrandLogo className="sidebar-brand-icon" />
        <span className="sidebar-brand-name">Sistema de Tesorería</span>
      </header>
    </>
  );
};

