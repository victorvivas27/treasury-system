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
                    `sidebar-footer-link gap-sm  flex-align-center ${isActive ? "active" : ""}`
                  }
                >
                  <Icon className="sidebar-footer-icon font-lg" />
                  <span className="sidebar-footer-text">{link.label}</span>
                </NavLink>
              </li>
            );
          })}

        </ul>

      </nav>


      <section className="sidebar-user flex-align-center gap-sm" aria-label="Usuario actual">

        <div className="sidebar-user-avatar ">
          <img src={avatar} alt={`Avatar de ${name}`} />
        </div>

        <div className="sidebar-user-info flex-col">
          <span className="sidebar-user-name font-sm">{name}</span>
          <span className="sidebar-user-email font-sm">{email}</span>
        </div>
      </section>
      <Button
        type="button"
        variant="secondary"
        onClick={() => { }}
        icon={<LogoutIcon className="sidebar-footer-icon font-lg" />}
        label="Cerrar sesión"
        className={!isSidebarOpen ? "button--sidebar-closed" : "button--sidebar-open"}
        size="small"
        testId="sidebar-logout-btn"
      />
    </footer>

  );
};
