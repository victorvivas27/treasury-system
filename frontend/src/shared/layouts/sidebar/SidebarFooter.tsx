import { IoBulbOutline } from "react-icons/io5";
import { OPEN_IMPROVEMENT_CENTER_EVENT } from "@/presentation/context/improvement/ImprovementCenterEvents";
import { NavLink } from "react-router-dom";
import type { FC } from "react";

import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { useOptionalNotifications } from "@/presentation/context/NotificationContext";

import {
  SIDEBAR_FOOTER_LINKS,
  SIDEBAR_USER_MOCK,
} from "@/shared/constants/Icons";

import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { Tooltip } from "@/shared/ui/tooltip/Tooltip";

import "./style/SidebarFooter.css";

interface SidebarFooterProps {
  onNavLinkClick?: () => void;
  isCollapsed?: boolean;
}

export const SidebarFooter: FC<SidebarFooterProps> = ({
  onNavLinkClick,
  isCollapsed = true,
}) => {
  const auth = useOptionalAuth();
  const notifications = useOptionalNotifications();

  const unreadCount = notifications?.unreadCount ?? 0;

  const name = auth?.user?.nombre ?? SIDEBAR_USER_MOCK.name;
  const email = auth?.user?.correo ?? SIDEBAR_USER_MOCK.email;

  return (
    <footer className="sidebar-footer">
      <button type="button" className="sidebar-improvement-button"
        aria-label="Centro de Mejoras"
        title="Centro de Mejoras"
        onClick={() => { onNavLinkClick?.(); window.dispatchEvent(new Event(OPEN_IMPROVEMENT_CENTER_EVENT)); }}>
        <IoBulbOutline aria-hidden="true" />
        <span>Mejoras</span>
        <Tooltip disabled={!isCollapsed} content="Centro de Mejoras" position="right" className="sidebar-icon-tooltip" />
      </button>
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
                  title={link.label}
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

                  <Tooltip disabled={!isCollapsed}
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
        title={`Mi perfil · ${name}`}
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

        <Tooltip disabled={!isCollapsed}
          content="Mi perfil"
          position="right"
          className="sidebar-icon-tooltip"
        />
      </NavLink>
    </footer>
  );
};
