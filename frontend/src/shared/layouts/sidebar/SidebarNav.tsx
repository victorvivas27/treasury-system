import { SIDEBAR_LINKS } from "@/shared/constants/Icons";
import "./style/SidebarNav.css";
import { NavLink } from "react-router-dom";
import type { UserRole } from "@/core/A-domain/entities/user/User";
import { useOptionalAuth } from "@/presentation/context/AuthContext";

interface SidebarNavProps {
  onNavLinkClick: () => void;
  role?: UserRole;
}

const ADMIN_PATHS = new Set(["/users", "/students", "/parents", "/family"]);

export const SidebarNav = ({ onNavLinkClick, role }: SidebarNavProps) => {
  const auth = useOptionalAuth();
  const currentRole = role ?? auth?.user?.rol;

  const handleClick = () => {
    onNavLinkClick();
  };

  return (
    <nav className="sidebar-nav">
      <ul className="sidebar-nav-ul">
        {SIDEBAR_LINKS.map((section) => (
          <li key={section.title} className="sidevar-nav-section">
            <ul>
              {section.links
                .filter((link) => currentRole === "ADMIN" || !ADMIN_PATHS.has(link.path))
                .map((link) => {
                const Icon = link.icon;

                return (
                  <li key={link.path}>
                    <NavLink
                      to={link.path}
                      className={({ isActive }) =>
                        `sidebar-nav-link-item ${isActive ? "active" : ""}`
                      }
                      onClick={handleClick}
                    >
                      <Icon className="sidebar-nav-icon" />
                      <span className="sidebar-nav-label">{link.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
};
