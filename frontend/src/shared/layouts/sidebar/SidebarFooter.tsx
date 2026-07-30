import { NavLink, useNavigate } from "react-router-dom";
import { useState, type FC } from "react";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { SIDEBAR_FOOTER_LINKS, SIDEBAR_USER_MOCK } from "@/shared/constants/Icons";
import { Button } from "@/shared/ui/button/Button";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import "./style/SidebarFooter.css";

interface SidebarProps {
  isSidebarOpen: boolean;
  onLogout?: () => Promise<void>;
  onNavLinkClick?: () => void;
}

export const SidebarFooter: FC<SidebarProps> = ({ isSidebarOpen, onLogout, onNavLinkClick }) => {
  const auth = useOptionalAuth();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { avatar, actions } = SIDEBAR_USER_MOCK;
  const name = auth?.user?.nombre ?? SIDEBAR_USER_MOCK.name;
  const email = auth?.user?.correo ?? SIDEBAR_USER_MOCK.email;
  const LogoutIcon = actions.logoutIcon;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await (onLogout ?? auth?.logout)?.();
      setIsLogoutModalOpen(false);
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <footer className={`sidebar-footer ${!isSidebarOpen ? "is-closed" : ""}`}>
        <nav className="sidebar-footer-nav" aria-label="Acciones secundarias">
          <ul className="sidebar-footer-list">
            {SIDEBAR_FOOTER_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.path} className="sidebar-footer-item">
                  <NavLink
                    to={link.path}
                    onClick={onNavLinkClick}
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

        <NavLink
          to="/profile"
          onClick={onNavLinkClick}
          className={({ isActive }) => `sidebar-user ${isActive ? "active" : ""}`}
          aria-label={`Ver perfil de ${name}`}
        >
          <div className="sidebar-user-avatar">
            <img src={avatar} alt="" />
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{name}</span>
            <span className="sidebar-user-email">{email}</span>
          </div>
        </NavLink>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsLogoutModalOpen(true)}
          icon={<LogoutIcon className="sidebar-footer-icon" />}
          label="Cerrar sesión"
          className={!isSidebarOpen ? "button--sidebar-closed" : "button--sidebar-open"}
          testId="sidebar-logout-btn"
        />
      </footer>

      <ModalConfirm
        isOpen={isLogoutModalOpen}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar la sesión?"
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
};
