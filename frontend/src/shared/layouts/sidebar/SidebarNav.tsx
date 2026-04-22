


import { SIDEBAR_LINKS } from "@/shared/constants/Icons";
import "./style/SidebarNav.css";
import { NavLink } from "react-router-dom";

export const SidebarNav = () => {
  return (
    <nav className="sidebar-nav">
      <ul className="sidebar-nav-ul">
        {SIDEBAR_LINKS.map((section) => (
          <li key={section.title} className="sidevar-nav-section">
            <ul className="sidebar-section-links">
              {section.links.map((link) => {
                const Icon = link.icon;

                return (
                  <li key={link.path}>
                    <NavLink
                      to={link.path}
                      className={({ isActive }) =>
                        `sidebar-nav-link-item ${isActive ? "active" : ""}`
                      }
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
