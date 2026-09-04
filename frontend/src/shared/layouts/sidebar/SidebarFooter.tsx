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
}

export const SidebarFooter: FC<SidebarFooterProps> = ({
  onNavLinkClick,
}) => {
  const auth = useOptionalAuth();
  const notifications = useOptionalNotifications();

  const unreadCount = notifications?.unreadCount ?? 0;

  const name = auth?.user?.nombre ?? SIDEBAR_USER_MOCK.name;
  const email = auth?.user?.correo ?? SIDEBAR_USER_MOCK.email;

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
    </footer>
  );
};
