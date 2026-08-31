import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { Link } from "react-router-dom";

import {
  FiCamera,
  FiEdit3,
  FiHeart,
  FiLogIn,
  FiLogOut,
  FiMenu,
  FiShield,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";

import type { User } from "@/core/A-domain/entities/user/User";

import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";

import "../style/HomeHeader.css";

const MOBILE_MENU_AUTO_CLOSE_MS = 4000;

const SECTION_IDS = [
  "sobre-nosotros",
  "fotos-del-curso",
  "contacto",
  "directiva",
] as const;

type SectionId = (typeof SECTION_IDS)[number];

interface HomeHeaderProps {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;

  user?:
    | (Pick<
        User,
        "nombre" | "profileImageType" | "profileImageUrl"
      > & { id?: number })
    | null;

  onLogout?: () => void;
}


export const HomeHeader = ({
  isAuthenticated = false,
  isAdmin = false,
  isSuperAdmin = false,
  user,
  onLogout,
}: HomeHeaderProps) => {
  const [activeSection, setActiveSection] =
    useState<SectionId>("sobre-nosotros");

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const headerRef = useRef<HTMLElement | null>(null);


  /* =========================================================
     ACTIVE SECTION
     ========================================================= */

  useEffect(() => {
    if (
      !isAuthenticated ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const sections = SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          )[0];

        const sectionId =
          visibleSection?.target.id as SectionId | undefined;

        if (sectionId) {
          setActiveSection(sectionId);
        }
      },
      {
        rootMargin: "-25% 0px -60%",
        threshold: 0,
      },
    );

    sections.forEach((section) => {
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  }, [isAuthenticated]);


  /* =========================================================
     CLOSE WITH ESCAPE / CLICK OUTSIDE
     ========================================================= */

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        headerRef.current &&
        !headerRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );
    const autoCloseTimer = window.setTimeout(
      () => setIsMobileMenuOpen(false),
      MOBILE_MENU_AUTO_CLOSE_MS,
    );

    return () => {
      window.clearTimeout(autoCloseTimer);
      window.removeEventListener("keydown", handleEscape);

      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, [isMobileMenuOpen]);


  /* =========================================================
     CLOSE WHEN RETURNING TO DESKTOP
     ========================================================= */

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1280) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);


  /* =========================================================
     HELPERS
     ========================================================= */

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((isOpen) => !isOpen);
  };

  const getSectionProps = (section: SectionId) => ({
    className:
      activeSection === section
        ? "is-active"
        : undefined,

    onClick: () => {
      setActiveSection(section);
      closeMobileMenu();
    },

    "aria-current":
      activeSection === section
        ? ("location" as const)
        : undefined,
  });

  const handleLogout = (
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();

    closeMobileMenu();
    onLogout?.();
  };


  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <header
      ref={headerRef}
      className="public-home__header"
    >
      {/* =====================================================
          BRAND / ACCOUNT
          ===================================================== */}

      {isAuthenticated ? (
        <Link
          className="public-home__account"
          to="/profile"
          onClick={closeMobileMenu}
          aria-label={`Ver perfil de ${
            user?.nombre ?? "Usuario"
          }`}
        >
          <UserAvatar
            user={user ?? null}
            className="public-home__account-avatar"
          />

          <span className="public-home__account-name">
            {user?.nombre ?? "Usuario"}
          </span>
        </Link>
      ) : (
        <Link
          className="public-home__brand"
          to="/"
          aria-label="Tesorería Escolar, inicio"
        >
          <BrandLogo alt="" />

          <span>Tesorería Escolar</span>
        </Link>
      )}


      {/* =====================================================
          MOBILE MENU BUTTON
          ===================================================== */}

      {isAuthenticated && (
        <button
          className="public-home__menu-toggle"
          type="button"
          aria-label={
            isMobileMenuOpen
              ? "Cerrar menú"
              : "Abrir menú"
          }
          aria-expanded={isMobileMenuOpen}
          aria-controls="public-home-menu"
          onClick={toggleMobileMenu}
        >
          <span className="public-home__menu-icon-shell">
            {isMobileMenuOpen && (
              <svg
                className="public-home__menu-timer"
                viewBox="0 0 40 40"
                aria-hidden="true"
              >
                <circle
                  className="public-home__menu-timer-track"
                  cx="20"
                  cy="20"
                  r="17.5"
                />
                <circle
                  className="public-home__menu-timer-progress"
                  cx="20"
                  cy="20"
                  r="17.5"
                  pathLength="100"
                  transform="rotate(-90 20 20)"
                />
              </svg>
            )}
            {isMobileMenuOpen ? (
              <FiX className="public-home__menu-icon" aria-hidden="true" />
            ) : (
              <FiMenu className="public-home__menu-icon" aria-hidden="true" />
            )}
          </span>
        </button>
      )}


      {/* =====================================================
          NAVIGATION
          ===================================================== */}

      <nav
        id={
          isAuthenticated
            ? "public-home-menu"
            : undefined
        }
        className={[
          "public-home__nav",
          isAuthenticated && "is-authenticated",
          isMobileMenuOpen && "is-open",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={
          isAuthenticated
            ? "Navegación de la comunidad"
            : "Acceso a la plataforma"
        }
      >
        {isAuthenticated ? (
          <>
            {/* SUPER ADMIN */}

            {isSuperAdmin && (
              <Link
                to="/administrations"
                onClick={closeMobileMenu}
              >
                <FiShield aria-hidden="true" />

                <span>Administraciones</span>
              </Link>
            )}


            {/* SOBRE NOSOTROS */}

            {isAdmin ? (
              <Link
                to="/admin/sobre-nosotros"
                onClick={closeMobileMenu}
              >
                <FiEdit3 aria-hidden="true" />

                <span>Editar Lo que nos mueve</span>
              </Link>
            ) : (
              <a
                href="#sobre-nosotros"
                {...getSectionProps(
                  "sobre-nosotros",
                )}
              >
                <FiHeart aria-hidden="true" />

                <span>Lo que nos mueve</span>
              </a>
            )}


            {/* FOTOS */}

            {isAdmin ? (
              <Link
                to="/admin/fotos-del-curso"
                onClick={closeMobileMenu}
              >
                <FiCamera aria-hidden="true" />

                <span>Editar fotos del curso</span>
              </Link>
            ) : (
              <a
                href="#fotos-del-curso"
                {...getSectionProps(
                  "fotos-del-curso",
                )}
              >
                <FiCamera aria-hidden="true" />

                <span>Fotos del curso</span>
              </a>
            )}


            {/* DIRECTIVA */}

            {isAdmin ? (
              <Link
                to="/admin/directiva"
                onClick={closeMobileMenu}
              >
                <FiUsers aria-hidden="true" />

                <span>Editar Directiva</span>
              </Link>
            ) : (
              <a
                href="#directiva"
                {...getSectionProps("directiva")}
              >
                <FiUsers aria-hidden="true" />

                <span>Directiva</span>
              </a>
            )}


            {/* SISTEMA */}

            <Link
              className="public-home__system-access"
              to="/dashboard"
              onClick={closeMobileMenu}
            >
              <BrandLogo
                className="public-home__system-access-logo"
                alt=""
                src="/icono-gestion-curso.png"
              />

              <span>Gestion del curso</span>
            </Link>


            {/* LOGOUT */}

            <button
              className="public-home__logout"
              type="button"
              onClick={handleLogout}
            >
              <FiLogOut aria-hidden="true" />

              <span>Cerrar sesión</span>
            </button>
          </>
        ) : (
          <>
            <Link
              className="public-home__login"
              to="/login"
            >
              <FiLogIn aria-hidden="true" />

              <span>Iniciar sesión</span>
            </Link>

            <Link
              className="public-home__register"
              to="/register"
            >
              <FiUserPlus aria-hidden="true" />

              <span>Crear cuenta</span>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};
