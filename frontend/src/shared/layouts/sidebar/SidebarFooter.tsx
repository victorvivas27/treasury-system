import { NavLink } from "react-router-dom";
import "./style/SidebarFooter.css";
import { SIDEBAR_FOOTER_LINKS, SIDEBAR_USER_MOCK } from "@/shared/constants/Icons";
import { Button } from "@/shared/ui/button/Button";
import type { FC } from "react";

interface SidebarProps {
  isSidebarOpen: boolean;

}
export const SidebarFooter: FC<SidebarProps> = ({ isSidebarOpen }) => {
  const { name, email, avatar, actions } = SIDEBAR_USER_MOCK;
  const LogoutIcon = actions.logoutIcon;

  return (
    <footer className={`sidebar-footer ${!isSidebarOpen ? "is-closed" : ""}`}>
      <nav className="sidebar-footer-nav" aria-label="Acciones secundarias">
        <ul className="sidebar-footer-list ">
          {SIDEBAR_FOOTER_LINKS.map((link) => {
            const Icon = link.icon;

            return (
              <li key={link.path} className="sidebar-footer-item  ">
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

        <div className="sidebar-user-avatar ">
          <img src={avatar} alt={`Avatar de ${name}`} />
        </div>

        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{name}</span>
          <span className="sidebar-user-email">{email}</span>
        </div>
      </section>
      <Button
        type="button"
        variant="secondary"
        onClick={() => { }}
        icon={<LogoutIcon className="sidebar-footer-icon" />}
        label="Cerrar sesión"
        className={!isSidebarOpen ? "button--sidebar-closed" : "button--sidebar-open"}
        testId="sidebar-logout-btn"
      />
    </footer>

  );
};
