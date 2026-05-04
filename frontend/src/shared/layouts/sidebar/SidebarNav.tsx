


import { SIDEBAR_LINKS } from "@/shared/constants/Icons";
import "./style/SidebarNav.css";
import { NavLink } from "react-router-dom";

export const SidebarNav = () => {
  return (
    <nav className="sidebar-nav">
      <ul className="sidebar-nav-ul">
        {SIDEBAR_LINKS.map((section) => (
          <li key={section.title} className="sidevar-nav-section">
            <ul>
              {section.links.map((link) => {
                const Icon = link.icon;

                return (
                  <li key={link.path}>
                    <NavLink
                      to={link.path}
                      className={({ isActive }) =>
                        `sidebar-nav-link-item flex-align-center gap-sm ${isActive ? "active" : ""}`
                      }
                    >
                      <Icon className="sidebar-nav-icon font-lg" />
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
