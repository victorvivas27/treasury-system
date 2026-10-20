
import { Link } from "react-router-dom";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import { Tooltip } from "@/shared/ui/tooltip/Tooltip";
import "./style/SidebarHeader.css";
type SidebarHeaderProps = {
  isCollapsed?: boolean;
};
export const SidebarHeader = ({ isCollapsed = true }: SidebarHeaderProps) => {
  return (
    <>
      <Link className="sidebar-brand-header" to="/" aria-label="Ir a la página de inicio">
        <BrandLogo className="sidebar-brand-icon" />
        <span className="sidebar-brand-name">Tesorería<small>Mi comunidad escolar</small></span>
        <Tooltip disabled={!isCollapsed} content="Inicio" position="right" className="sidebar-icon-tooltip" />
      </Link>


    </>
  );
};

