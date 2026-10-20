import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  FiCalendar, FiCamera, FiEdit3, FiHeart, FiGitBranch,
  FiLogIn, FiLogOut, FiMenu, FiShield, FiUsers, FiX,
} from "react-icons/fi";
import type { User } from "@/core/A-domain/entities/user/User";
import { useArchitectureAccess } from "@/presentation/hooks/architecture/useArchitectureAccess";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { HomeInstallGuide } from "./HomeInstallGuide";
import "../style/HomeHeader.css";

const MOBILE_MENU_AUTO_CLOSE_MS = 4000;
const SECTION_IDS = ["sobre-nosotros", "fotos-del-curso", "contacto", "directiva"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const COMMUNITY_LINKS = [
  { id: "sobre-nosotros", label: "Lo que nos mueve", icon: FiHeart,
    editTo: "/admin/sobre-nosotros", editLabel: "Editar Lo que nos mueve", editIcon: FiEdit3 },
  { id: "fotos-del-curso", label: "Fotos del curso", icon: FiCamera,
    editTo: "/admin/fotos-del-curso", editLabel: "Editar fotos del curso", editIcon: FiCamera },
  { id: "directiva", label: "Directiva", icon: FiUsers,
    editTo: "/admin/directiva", editLabel: "Editar Directiva", editIcon: FiUsers },
] as const;

interface HomeHeaderProps {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  user?: (Pick<User, "nombre" | "profileImageType" | "profileImageUrl"> & { id?: number }) | null;
  onLogout?: () => void;
}

export const HomeHeader = ({
  isAuthenticated = false, isAdmin = false, isSuperAdmin = false, user, onLogout,
}: HomeHeaderProps) => {
  const architectureAccess = useArchitectureAccess(
    isAuthenticated ? user?.id : undefined,
    isSuperAdmin ? "SUPER_ADMIN" : undefined,
  );
  const [activeSection, setActiveSection] = useState<SectionId>("sobre-nosotros");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    if (!isAuthenticated || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      if (visible) setActiveSection(visible.target.id as SectionId);
    }, { rootMargin: "-25% 0px -60%", threshold: 0 });
    SECTION_IDS.forEach(id => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    document.addEventListener("pointerdown", handlePointerDown);
    const timer = window.setTimeout(() => setIsMobileMenuOpen(false), MOBILE_MENU_AUTO_CLOSE_MS);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleEscape);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getSectionProps = (section: SectionId) => ({
    className: activeSection === section ? "is-active" : undefined,
    onClick: () => { setActiveSection(section); closeMobileMenu(); },
    "aria-current": activeSection === section ? ("location" as const) : undefined,
  });
  const handleLogout = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    closeMobileMenu();
    onLogout?.();
  };

  return (
    <header ref={headerRef} className="public-home__header">
      {isAuthenticated ? (
        <Link className="public-home__account" to="/profile" onClick={closeMobileMenu}
          aria-label={`Ver perfil de ${user?.nombre ?? "Usuario"}`}>
          <UserAvatar user={user ?? null} className="public-home__account-avatar" />
          <span className="public-home__account-name">{user?.nombre ?? "Usuario"}</span>
        </Link>
      ) : (
        <Link className="public-home__brand" to="/" aria-label="Tesorería Escolar, inicio">
          <BrandLogo alt="" />
          <span>Tesorería Escolar</span>
        </Link>
      )}

      {isAuthenticated && (
        <button className="public-home__menu-toggle" type="button"
          aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMobileMenuOpen} aria-controls="public-home-menu"
          onClick={() => setIsMobileMenuOpen(open => !open)}>
          <span className="public-home__menu-icon-shell">
            {isMobileMenuOpen && (
              <svg className="public-home__menu-timer" viewBox="0 0 40 40" aria-hidden="true">
                <circle className="public-home__menu-timer-track" cx="20" cy="20" r="17.5" />
                <circle className="public-home__menu-timer-progress" cx="20" cy="20" r="17.5"
                  pathLength="100" transform="rotate(-90 20 20)" />
              </svg>
            )}
            {isMobileMenuOpen
              ? <FiX className="public-home__menu-icon" aria-hidden="true" />
              : <FiMenu className="public-home__menu-icon" aria-hidden="true" />}
          </span>
        </button>
      )}

      <nav id={isAuthenticated ? "public-home-menu" : undefined}
        className={["public-home__nav", isAuthenticated && "is-authenticated", isMobileMenuOpen && "is-open"]
          .filter(Boolean).join(" ")}
        aria-label={isAuthenticated ? "Navegación de la comunidad" : "Acceso a la plataforma"}>
        {isAuthenticated ? (
          <>
            {isSuperAdmin && (
              <Link to="/administrations" onClick={closeMobileMenu}>
                <span className="public-home__nav-icon"><FiShield aria-hidden="true" /></span><span>Administraciones</span>
              </Link>
            )}
            {isSuperAdmin && architectureAccess.allowed && (
              <Link to="/admin/arquitectura" title="Arquitectura del sistema"
                aria-label="Arquitectura del sistema" onClick={closeMobileMenu}>
                <span className="public-home__nav-icon"><FiGitBranch aria-hidden="true" /></span><span>Arquitectura del sistema</span>
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin/horario-clases" onClick={closeMobileMenu}>
                <span className="public-home__nav-icon"><FiCalendar aria-hidden="true" /></span><span>Gestionar horario de clases</span>
              </Link>
            )}
            {COMMUNITY_LINKS.map(({ id, label, icon: Icon, editTo, editLabel, editIcon: EditIcon }) => (
              isAdmin ? (
                <Link key={id} to={editTo} onClick={closeMobileMenu}>
                  <span className="public-home__nav-icon"><EditIcon aria-hidden="true" /></span><span>{editLabel}</span>
                </Link>
              ) : (
                <a key={id} href={`#${id}`} {...getSectionProps(id)}>
                  <span className="public-home__nav-icon"><Icon aria-hidden="true" /></span><span>{label}</span>
                </a>
              )
            ))}
            <Link className="public-home__system-access" to="/dashboard" onClick={closeMobileMenu}>
              <BrandLogo className="public-home__system-access-logo" alt="" src="/icono-gestion-curso.png" />
              <span>Gestion del curso</span>
            </Link>
            <button className="public-home__logout" type="button" onClick={handleLogout}>
              <span className="public-home__nav-icon"><FiLogOut aria-hidden="true" /></span><span>Cerrar sesión</span>
            </button>
          </>
        ) : (
          <>
          <HomeInstallGuide />
          <Link className="public-home__login" to="/login">
            <FiLogIn aria-hidden="true" /><span>Iniciar sesión</span>
          </Link>
          </>
        )}
      </nav>
    </header>
  );
};
