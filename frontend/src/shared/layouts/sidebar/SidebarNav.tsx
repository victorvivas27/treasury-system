import { ICONS, SIDEBAR_LINKS, TREASURY_LINKS } from "@/shared/constants/Icons";
import "./style/SidebarNav.css";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type { UserRole } from "@/core/A-domain/entities/user/User";
import { useOptionalAuth } from "@/presentation/context/AuthContext";

interface SidebarNavProps {
  onNavLinkClick: () => void;
  role?: UserRole;
}

const ADMIN_PATHS = new Set(["/users", "/students", "/parents", "/family"]);
const USER_TREASURY_PATHS = new Set([
  "/tesoreria/ingresos", "/tesoreria/gastos", "/tesoreria/stands", "/tesoreria/pagos",
]);
const TREASURY_MENU_AUTO_CLOSE_MS = 6000;

export const SidebarNav = ({ onNavLinkClick, role }: SidebarNavProps) => {
  const auth = useOptionalAuth();
  const currentRole = role ?? auth?.user?.rol;
  const location = useLocation();
  const [isTreasuryOpen, setIsTreasuryOpen] = useState(false);
  const visibleTreasuryLinks = currentRole === "ADMIN"
    ? TREASURY_LINKS
    : TREASURY_LINKS.filter(link => USER_TREASURY_PATHS.has(link.path));

  const handleClick = () => {
    onNavLinkClick();
  };

  useEffect(() => {
    if (!isTreasuryOpen) return;
    const timer = window.setTimeout(
      () => setIsTreasuryOpen(false),
      TREASURY_MENU_AUTO_CLOSE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isTreasuryOpen]);

  const handleTreasuryLinkClick = () => {
    setIsTreasuryOpen(false);
  };

  return (
    <nav className={`sidebar-nav ${isTreasuryOpen ? "sidebar-nav--treasury-open" : ""}`}>
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
                      data-tour-path={link.path}
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
        {currentRole && <li className="sidebar-nav-section sidebar-nav-section--treasury">
          <button
            type="button"
            className={`sidebar-nav-link-item sidebar-nav-parent ${
              location.pathname.startsWith("/tesoreria") ? "active" : ""
            } ${isTreasuryOpen ? "is-open" : ""}`}
            data-tour="treasury"
            aria-expanded={isTreasuryOpen}
            aria-controls="treasury-submenu"
            onClick={() => setIsTreasuryOpen((open) => !open)}
          >
            <ICONS.tesoreria className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Tesorería</span>
            <ICONS.expand
              className={`sidebar-nav-chevron ${isTreasuryOpen ? "is-open" : ""}`}
            />
          </button>
          {isTreasuryOpen && (
            <ul id="treasury-submenu" className="sidebar-submenu">
              {visibleTreasuryLinks.map((link) => {
                const TreasuryIcon = link.icon;
                return <li key={link.path}>
                  <NavLink
                    to={link.path}
                    className={({ isActive }) =>
                      `sidebar-submenu-link ${isActive ? "active" : ""}`
                    }
                    onClick={handleTreasuryLinkClick}
                  >
                    <TreasuryIcon className="sidebar-submenu-icon" aria-hidden="true" />
                    {currentRole === "USER" && link.path === "/tesoreria/stands"
                      ? "Resumen de stands" : link.label}
                  </NavLink>
                </li>
              })}
            </ul>
          )}
        </li>}
      </ul>
    </nav>
  );
};
