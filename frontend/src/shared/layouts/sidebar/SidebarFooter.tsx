import { NavLink } from "react-router-dom";
import "./style/SidebarFooter.css";
import { SIDEBAR_FOOTER_LINKS, SIDEBAR_USER_MOCK } from "@/shared/constants/Icons";

export const SidebarFooter = () => {
  const { name, email, avatar, actions } = SIDEBAR_USER_MOCK;
  const LogoutIcon = actions.logoutIcon;

  return (
    <footer className="sidebar-footer">
      <nav className="sidebar-footer-nav" aria-label="Acciones secundarias">
        <ul className="sidebar-footer-list">
          {SIDEBAR_FOOTER_LINKS.map((link) => {
            const Icon = link.icon;

            return (
              <li key={link.path} className="sidebar-footer-item">
                <NavLink
                  to={link.path}
                  className={({ isActive }) =>
                    `sidebar-footer-link ${isActive ? "active" : ""}`
                  }
                >
                  <Icon className="sidebar-footer-icon" />
                  <span className="sidebar-footer-text">{link.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="sidebar-user" aria-label="Usuario actual">
        <div className="sidebar-user-avatar">
          <img src={avatar} alt={`Avatar de ${name}`} />
        </div>

        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{name}</span>
          <span className="sidebar-user-email">{email}</span>
        </div>

        <button
          type="button"
          className="sidebar-user-logout"
          aria-label={actions.logoutLabel}
        >
          <LogoutIcon className="sidebar-footer-icon" />
        </button>
      </section>
    </footer>
  );
};
