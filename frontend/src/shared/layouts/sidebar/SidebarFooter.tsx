import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type FC } from "react";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { SIDEBAR_FOOTER_LINKS, SIDEBAR_USER_MOCK } from "@/shared/constants/Icons";
import { Button } from "@/shared/ui/button/Button";
import { useOptionalNotifications } from "@/presentation/context/NotificationContext";
import "./style/SidebarFooter.css";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { Tooltip } from "@/shared/ui/tooltip/Tooltip";
import { FiLogOut } from "react-icons/fi";

interface SidebarProps {
  isSidebarOpen: boolean;
  onLogout?: () => Promise<void>;
  onNavLinkClick?: () => void;
}

export const SidebarFooter: FC<SidebarProps> = ({ isSidebarOpen, onLogout, onNavLinkClick }) => {
  const auth = useOptionalAuth();
  const unreadCount = useOptionalNotifications()?.unreadCount ?? 0;
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutTimer = useRef<number | undefined>(undefined);
  const name = auth?.user?.nombre ?? SIDEBAR_USER_MOCK.name;
  const email = auth?.user?.correo ?? SIDEBAR_USER_MOCK.email;

  useEffect(() => () => {
    if (logoutTimer.current !== undefined) window.clearTimeout(logoutTimer.current);
  }, []);

  const handleLogout = () => {
    if (isLoggingOut) {
      if (logoutTimer.current !== undefined) window.clearTimeout(logoutTimer.current);
      logoutTimer.current = undefined;
      setIsLoggingOut(false);
      return;
    }

    setIsLoggingOut(true);
    logoutTimer.current = window.setTimeout(() => {
      logoutTimer.current = undefined;
      void (async () => {
        await (onLogout ?? auth?.logout)?.();
        navigate("/", { replace: true });
      })();
    }, 2000);
  };

  return (
    <>
      <footer className={`sidebar-footer ${!isSidebarOpen ? "is-closed" : ""}`}>
        <nav className="sidebar-footer-nav" aria-label="Acciones secundarias">
          <ul className="sidebar-footer-list">
            {SIDEBAR_FOOTER_LINKS.map((link) => {
              const Icon = link.icon;
              const isNotifications = link.path === "/notifications";
              const hasUnread = isNotifications && unreadCount > 0;
              return (
                <li key={link.path} className="sidebar-footer-item">
                  <NavLink
                    to={link.path}
                    data-tour-path={link.path}
                    onClick={onNavLinkClick}
                    className={({ isActive }) =>
                      `sidebar-footer-link ${isActive ? "active" : ""} ${hasUnread ? "has-unread" : ""}`
                    }
                    aria-label={hasUnread ? `${link.label}: ${unreadCount} sin leer` : link.label}
                  >
                    <span className="sidebar-footer-icon-wrap">
                      <span className="sidebar-footer-chat-motion">
                        <Icon className="sidebar-footer-icon" />
                      </span>
                      {hasUnread && <span className="sidebar-footer-badge">
                        {unreadCount > 99 ? "99+" : unreadCount}</span>}
                    </span>
                    <span className="sidebar-footer-text">{link.label}</span>
                    <Tooltip content={link.label} position="right" className="sidebar-icon-tooltip" />
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <NavLink
          to="/profile"
          data-tour-path="/profile"
          onClick={onNavLinkClick}
          className={({ isActive }) => `sidebar-user ${isActive ? "active" : ""}`}
          aria-label={`Ver perfil de ${name}`}
        >
          <UserAvatar user={auth?.user ?? null} fallbackName={name} className="sidebar-user-avatar" />
          <div className="sidebar-user-info">
            <span className="sidebar-user-name" title={name}>{name}</span>
            <span className="sidebar-user-email" title={email}>{email}</span>
          </div>
          <Tooltip content="Mi perfil" position="right" className="sidebar-icon-tooltip" />
        </NavLink>

        <span className="sidebar-logout-action">
          <Button
            type="button"
            variant="secondary"
            onClick={handleLogout}
            icon={<FiLogOut className="sidebar-footer-icon" />}
            label="Cerrar sesión"
            ariaLabel={isLoggingOut ? "Cancelar cierre de sesión" : "Cerrar sesión"}
            className={`${!isSidebarOpen ? "button--sidebar-closed" : "button--sidebar-open"} ${
              isLoggingOut ? "sidebar-logout-progress" : ""}`}
            testId="sidebar-logout-btn"
          />
          <Tooltip content="Cerrar sesión" position="right" className="sidebar-icon-tooltip" />
        </span>
      </footer>

    </>
  );
};
