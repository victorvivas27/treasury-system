import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type FC } from "react";
import { LuLogOut } from "react-icons/lu";

import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { useOptionalNotifications } from "@/presentation/context/NotificationContext";

import {
  SIDEBAR_FOOTER_LINKS,
  SIDEBAR_USER_MOCK,
} from "@/shared/constants/Icons";

import { Button } from "@/shared/ui/button/Button";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { Tooltip } from "@/shared/ui/tooltip/Tooltip";

import "./style/SidebarFooter.css";

interface SidebarFooterProps {
  isSidebarOpen: boolean;
  onLogout?: () => Promise<void>;
  onNavLinkClick?: () => void;
}

export const SidebarFooter: FC<SidebarFooterProps> = ({
  isSidebarOpen,
  onLogout,
  onNavLinkClick,
}) => {
  const auth = useOptionalAuth();
  const notifications = useOptionalNotifications();
  const navigate = useNavigate();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutTimer = useRef<number | undefined>(undefined);

  const unreadCount = notifications?.unreadCount ?? 0;

  const name = auth?.user?.nombre ?? SIDEBAR_USER_MOCK.name;
  const email = auth?.user?.correo ?? SIDEBAR_USER_MOCK.email;

  useEffect(() => {
    return () => {
      if (logoutTimer.current !== undefined) {
        window.clearTimeout(logoutTimer.current);
      }
    };
  }, []);

  const handleLogout = () => {
    if (isLoggingOut) {
      if (logoutTimer.current !== undefined) {
        window.clearTimeout(logoutTimer.current);
      }

      logoutTimer.current = undefined;
      setIsLoggingOut(false);

      return;
    }

    setIsLoggingOut(true);

    logoutTimer.current = window.setTimeout(async () => {
      logoutTimer.current = undefined;

      await (onLogout ?? auth?.logout)?.();

      navigate("/", { replace: true });
    }, 2000);
  };

  return (
    <footer className="sidebar-footer">
      <nav
        className="sidebar-footer-nav"
        aria-label="Acciones secundarias"
      >
        <ul className="sidebar-footer-list">
          {SIDEBAR_FOOTER_LINKS.map((link) => {
            const Icon = link.icon;

            const isNotifications = link.path === "/notifications";
            const hasUnread = isNotifications && unreadCount > 0;

            return (
              <li
                key={link.path}
                className="sidebar-footer-item"
              >
                <NavLink
                  to={link.path}
                  data-tour-path={link.path}
                  onClick={onNavLinkClick}
                  className={({ isActive }) =>
                    [
                      "sidebar-footer-link",
                      isActive && "active",
                      hasUnread && "has-unread",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  aria-label={
                    hasUnread
                      ? `${link.label}: ${unreadCount} sin leer`
                      : link.label
                  }
                >
                  <span className="sidebar-footer-icon-wrap">
                    <span className="sidebar-footer-chat-motion">
                      <Icon className="sidebar-footer-icon" />
                    </span>

                    {hasUnread && (
                      <span className="sidebar-footer-badge">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </span>

                  <span className="sidebar-footer-text">
                    {link.label}
                  </span>

                  <Tooltip
                    content={link.label}
                    position="right"
                    className="sidebar-icon-tooltip"
                  />
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
        className={({ isActive }) =>
          `sidebar-user ${isActive ? "active" : ""}`
        }
        aria-label={`Ver perfil de ${name}`}
      >
        <UserAvatar
          user={auth?.user ?? null}
          fallbackName={name}
          className="sidebar-user-avatar"
        />

        <div className="sidebar-user-info">
          <span
            className="sidebar-user-name"
            title={name}
          >
            {name}
          </span>

          <span
            className="sidebar-user-email"
            title={email}
          >
            {email}
          </span>
        </div>

        <Tooltip
          content="Mi perfil"
          position="right"
          className="sidebar-icon-tooltip"
        />
      </NavLink>

      <div className="sidebar-logout-action">
        <Button
          type="button"
          variant="secondary"
          onClick={handleLogout}
          icon={
            <span className="sidebar-logout-icon-shell">
              {isLoggingOut && (
                <svg
                  className="sidebar-logout-timer"
                  viewBox="0 0 40 40"
                  aria-hidden="true"
                >
                  <circle
                    className="sidebar-logout-timer-track"
                    cx="20"
                    cy="20"
                    r="17.5"
                  />

                  <circle
                    className="sidebar-logout-timer-progress"
                    cx="20"
                    cy="20"
                    r="17.5"
                    pathLength="100"
                    transform="rotate(-90 20 20)"
                  />
                </svg>
              )}

              <LuLogOut
                className="sidebar-logout-icon"
                aria-hidden="true"
              />
            </span>
          }
          label="Cerrar sesión"
          ariaLabel={
            isLoggingOut
              ? "Cancelar cierre de sesión"
              : "Cerrar sesión"
          }
          className={
            `${isSidebarOpen
              ? "button--sidebar-open"
              : "button--sidebar-closed"} ${isLoggingOut
              ? "sidebar-logout-progress"
              : ""}`
          }
          testId="sidebar-logout-btn"
        />

        <Tooltip
          content={
            isLoggingOut
              ? "Cancelar cierre de sesión"
              : "Cerrar sesión"
          }
          position="right"
          className="sidebar-icon-tooltip"
        />
      </div>
    </footer>
  );
};
