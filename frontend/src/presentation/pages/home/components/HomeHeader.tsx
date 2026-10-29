import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { Link } from "react-router-dom";
import {
  FiBarChart2, FiTool, FiCamera, FiHeart, FiGitBranch,
  FiLogIn, FiLogOut, FiMenu, FiShield, FiUsers, FiX, FiChevronDown,
  FiCalendar, FiGift, FiBell, FiUser, FiSettings,
} from "react-icons/fi";
import type { User } from "@/core/A-domain/entities/user/User";
import { useArchitectureAccess } from "@/presentation/hooks/architecture/useArchitectureAccess";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { MobileNavigation } from "@/shared/layouts/mobile/MobileNavigation";
import { HomeInstallGuide } from "./HomeInstallGuide";
import "../style/HomeHeader.css";
import "../style/HomeHeaderAccount.css";
import "../style/HomeHeaderMotion.css";

function closePanel(details: HTMLDetailsElement | null, exit: RefObject<Animation | null>) {
  if (!details?.open || exit.current) return;
  const panel = details.querySelector<HTMLElement>(".public-home__account-links, .public-home__administration-links");
  if (!panel?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    details.open = false;
    return;
  }
  const current = getComputedStyle(panel);
  panel.inert = true;
  const animation = panel.animate([
    { opacity: current.opacity, transform: current.transform },
    { opacity: .8, transform: "perspective(700px) translateY(3px) scale(.98) rotateX(-3deg)", offset: .28 },
    { opacity: 0, transform: "perspective(700px) translateY(-14px) scale(.9) rotateX(12deg)" },
  ], { duration: 240, easing: "cubic-bezier(.55, 0, .8, .35)", fill: "forwards" });
  exit.current = animation;
  animation.onfinish = () => {
    details.open = false;
    panel.inert = false;
    exit.current = null;
    animation.cancel();
  };
}

const SECTION_IDS = ["sobre-nosotros", "fotos-del-curso", "contacto", "directiva"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const COMMUNITY_LINKS = [
  { id: "sobre-nosotros", label: "Lo que nos mueve", icon: FiHeart },
  { id: "fotos-del-curso", label: "Fotos del curso", icon: FiCamera },
  { id: "directiva", label: "Directiva", icon: FiUsers },
] as const;

interface HomeHeaderProps {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  user?: (Pick<User, "nombre" | "profileImageType" | "profileImageUrl"> & { id?: number }) | null;
  onLogout?: () => void;
  showCommunityLinks?: boolean;
}

export const HomeHeader = ({
  isAuthenticated = false, isAdmin = false, isSuperAdmin = false, user, onLogout, showCommunityLinks = true,
}: HomeHeaderProps) => {
  const architectureAccess = useArchitectureAccess(
    isAuthenticated ? user?.id : undefined,
    isSuperAdmin ? "SUPER_ADMIN" : undefined,
  );
  const [course, setCourse] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("sobre-nosotros");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCompactNavigation, setIsCompactNavigation] = useState(() => window.matchMedia("(max-width: 1023px)").matches);
  const headerRef = useRef<HTMLElement | null>(null);
  const administrationRef = useRef<HTMLDetailsElement | null>(null);
  const accountRef = useRef<HTMLDetailsElement | null>(null);
  const accountExit = useRef<Animation | null>(null);
  const closeAccount = () => closePanel(accountRef.current, accountExit);
  const administrationExit = useRef<Animation | null>(null);
  const closeAdministration = () => closePanel(administrationRef.current, administrationExit);
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    closeAdministration();
    closeAccount();
  };

  useEffect(() => {
    if (!isAuthenticated || !isCompactNavigation) return;
    let active = true;
    let changed = false;
    const update = (event: Event) => {
      const value = (event as CustomEvent<string | { course: string }>).detail;
      if (!value) return;
      changed = true;
      setCourse(typeof value === "string" ? value : value.course);
    };
    window.addEventListener("managed-course-changed", update);
    void new TreasuryRepositoryImpl().getManagedCourseSettings().then(settings => {
      if (active && !changed) setCourse(settings.course);
    }).catch(() => undefined);
    return () => { active = false; window.removeEventListener("managed-course-changed", update); };
  }, [isAuthenticated, isCompactNavigation]);

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) closeAccount();
      const details = administrationRef.current;
      if (details && !details.contains(event.target as Node)) closeAdministration();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && accountRef.current?.open) {
        closeAccount();
        accountRef.current.querySelector("summary")?.focus();
      }
      const details = administrationRef.current;
      if (event.key === "Escape" && details?.open) {
        closeAdministration();
        details.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
      administrationExit.current?.cancel();
      accountExit.current?.cancel();
    };
  }, []);

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
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const handleResize = () => {
      setIsCompactNavigation(media.matches);
      setIsMobileMenuOpen(false);
    };
    media.addEventListener("change", handleResize);
    return () => media.removeEventListener("change", handleResize);
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

  const administrationLinks = (
    <div className="public-home__administration-links">
      {isSuperAdmin && <Link to="/administrations" onClick={closeMobileMenu}>
        <span className="public-home__nav-icon public-home__nav-icon--administrations"><FiShield aria-hidden="true" /></span><span>Administraciones</span>
      </Link>}
      {isSuperAdmin && architectureAccess.allowed && <Link to="/admin/arquitectura"
        title="Arquitectura del sistema" aria-label="Arquitectura del sistema" onClick={closeMobileMenu}>
        <span className="public-home__nav-icon public-home__nav-icon--architecture"><FiGitBranch aria-hidden="true" /></span><span>Arquitectura del sistema</span>
      </Link>}
      {(isAdmin || isSuperAdmin) && <>
        <Link to="/admin/mejoras" onClick={closeMobileMenu}>
          <span className="public-home__nav-icon"><FiTool aria-hidden="true" /></span><span>Gestión de Mejoras</span>
        </Link>
        <Link to="/admin/reportes-calidad" onClick={closeMobileMenu}>
          <span className="public-home__nav-icon"><FiBarChart2 aria-hidden="true" /></span><span>Reportes de calidad</span>
        </Link>
      </>}
    </div>
  );

  return (
    <>
    {isAuthenticated && <MobileNavigation />}
    <header ref={headerRef} className="public-home__header">
      {isAuthenticated && <span className="public-home__mobile-title">{course && <small>{course.replace(/^Curso\s+/i, "").trim().replace(/^(\d+)\s*\u00b0?\s*([a-z])$/i, "$1\u00b0 $2")}</small>}</span>}
      {isAuthenticated ? (
        <details ref={accountRef} className="public-home__account-menu"
          onBlur={event => {
            // Touch browsers may blur the trigger with no next focus target before dispatching click.
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) closeAccount();
          }}>
          <summary className="public-home__account" aria-label={`Opciones de cuenta de ${user?.nombre ?? "Usuario"}`}
            onClick={event => {
              setIsMobileMenuOpen(false);
              closeAdministration();
              if (accountRef.current?.open) { event.preventDefault(); closeAccount(); }
            }}>
            <UserAvatar user={user ?? null} className="public-home__account-avatar" />
          </summary>
          <div className="public-home__account-links">
            <div className="public-home__account-identity">
              <UserAvatar user={user ?? null} className="public-home__account-portrait" />
              <div><span>Mi cuenta</span><strong>{user?.nombre ?? "Usuario"}</strong></div>
            </div>
            <Link to="/profile" onClick={closeAccount}><FiUser aria-hidden="true" />Mi perfil</Link>
            <Link to="/configuration" onClick={closeAccount}><FiSettings aria-hidden="true" />Configuración</Link>
            <HomeInstallGuide placement="menu" />
            <button className="public-home__account-logout" type="button" onClick={handleLogout}>
              <FiLogOut aria-hidden="true" /><span>Cerrar sesión</span>
            </button>
          </div>
        </details>
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
          onClick={() => { closeAccount(); setIsMobileMenuOpen(open => !open); }}>
          <span className="public-home__menu-icon-shell">
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
            <div className="public-home__menu-heading">
              <strong>Tu comunidad</strong>
            </div>
            <Link className="public-home__system-access" to="/dashboard" onClick={closeMobileMenu}
              aria-label="Gestión del curso" title="Gestión del curso">
              <BrandLogo className="public-home__system-access-logo" alt="" src="/icono-gestion-curso.png" />
              <span>Gestión</span>
            </Link>
            <Link to="/calendario/horario-clases" onClick={closeMobileMenu}
              aria-label="Calendario académico" title="Calendario académico">
              <span className="public-home__nav-icon public-home__nav-icon--schedule"><FiCalendar aria-hidden="true" /></span><span>Calendario</span>
            </Link>
            <Link to="/birthdays" onClick={closeMobileMenu}>
              <span className="public-home__nav-icon"><FiGift aria-hidden="true" /></span><span>Cumpleaños</span>
            </Link>
            <Link to="/notifications" onClick={closeMobileMenu}>
              <span className="public-home__nav-icon"><FiBell aria-hidden="true" /></span><span>Notificaciones</span>
            </Link>
            {(isAdmin || isSuperAdmin) && (isCompactNavigation ? (
              <div className="public-home__administration-mobile">
                <p className="public-home__administration-heading">Administración</p>
                {administrationLinks}
              </div>
            ) : (
              <details ref={administrationRef} className="public-home__administration"
                onBlur={event => {
                  if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) {
                    closeAdministration();
                  }
                }}>
                <summary onClick={event => {
                  if (administrationRef.current?.open) {
                    event.preventDefault();
                    closeAdministration();
                  }
                }}><FiShield aria-hidden="true" /><span>Administrar</span><FiChevronDown aria-hidden="true" /></summary>
                {administrationLinks}
              </details>
            ))}
            {showCommunityLinks && !isAdmin && COMMUNITY_LINKS.map(({ id, label, icon: Icon }) => (
                <a key={id} href={`#${id}`} {...getSectionProps(id)}>
                  <span className={`public-home__nav-icon public-home__nav-icon--${id}`}><Icon aria-hidden="true" /></span><span>{label}</span>
                </a>
            ))}
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
    </>
  );
};
