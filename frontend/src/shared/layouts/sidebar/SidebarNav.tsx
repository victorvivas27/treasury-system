import {
  ICONS,
  SIDEBAR_LINKS,
  TREASURY_LINKS,
} from "@/shared/constants/Icons";

import "./style/SidebarNav.css";

import {
  NavLink,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import type {
  UserRole,
} from "@/core/A-domain/entities/user/User";

import {
  isAdminRole,
} from "@/core/A-domain/entities/user/User";

import {
  useOptionalAuth,
} from "@/presentation/context/AuthContext";

import {
  Tooltip,
} from "@/shared/ui/tooltip/Tooltip";


interface SidebarNavProps {
  onNavLinkClick: () => void;
  role?: UserRole;
}


const ADMIN_PATHS = new Set([
  "/users",
  "/students",
  "/parents",
  "/family",
  "/admin/mejoras",
]);


const USER_TREASURY_PATHS = new Set([
  "/tesoreria/ingresos",
  "/tesoreria/gastos",
  "/tesoreria/stands",
  "/tesoreria/pagos",
]);


const TREASURY_MENU_AUTO_CLOSE_MS = 6000;


export const SidebarNav = ({
  onNavLinkClick,
  role,
}: SidebarNavProps) => {
  const auth = useOptionalAuth();

  const currentRole =
    role ?? auth?.user?.rol;

  const location = useLocation();

  const [
    isTreasuryOpen,
    setIsTreasuryOpen,
  ] = useState(false);


  /* =========================================================
     LINKS VISIBLES DE TESORERÍA
     ========================================================= */

  const visibleTreasuryLinks =
    isAdminRole(currentRole)
      ? TREASURY_LINKS
      : TREASURY_LINKS.filter((link) =>
          USER_TREASURY_PATHS.has(link.path),
        );


  /* =========================================================
     CLICK DE NAVEGACIÓN NORMAL
     ========================================================= */

  const handleClick = () => {
    onNavLinkClick();
  };


  /* =========================================================
     AUTO CLOSE TESORERÍA
     ========================================================= */

  useEffect(() => {
    if (!isTreasuryOpen) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setIsTreasuryOpen(false);
      },
      TREASURY_MENU_AUTO_CLOSE_MS,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [isTreasuryOpen]);


  /* =========================================================
     CLICK LINK TESORERÍA
     ========================================================= */

  const handleTreasuryLinkClick = () => {
    setIsTreasuryOpen(false);
  };


  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <nav
      className={[
        "sidebar-nav",
        isTreasuryOpen &&
          "sidebar-nav--treasury-open",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ul className="sidebar-nav-ul">

        {/* ===================================================
            LINKS PRINCIPALES
            =================================================== */}

        {SIDEBAR_LINKS.map((section) => (
          <li
            key={section.title}
            className="sidebar-nav-section"
          >
            <ul>
              {section.links
                .filter(
                  (link) =>
                    isAdminRole(currentRole) ||
                    !ADMIN_PATHS.has(link.path),
                )
                .map((link) => {
                  const Icon = link.icon;

                  return (
                    <li key={link.path}>
                      <NavLink
                        to={link.path}
                        data-tour-path={link.path}
                        className={({
                          isActive,
                        }) =>
                          [
                            "sidebar-nav-link-item",
                            isActive && "active",
                          ]
                            .filter(Boolean)
                            .join(" ")
                        }
                        onClick={handleClick}
                      >
                        <Icon
                          className="sidebar-nav-icon"
                          aria-hidden="true"
                        />

                        <span className="sidebar-nav-label">
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
          </li>
        ))}


        {/* ===================================================
            TESORERÍA
            =================================================== */}

        {currentRole && (
          <li
            className="
              sidebar-nav-section
              sidebar-nav-section--treasury
            "
          >
            {/* ===============================================
                BOTÓN PADRE TESORERÍA
                =============================================== */}

            <button
              type="button"
              className={[
                "sidebar-nav-link-item",
                "sidebar-nav-parent",

                location.pathname.startsWith(
                  "/tesoreria",
                ) && "active",

                isTreasuryOpen &&
                  "is-open",
              ]
                .filter(Boolean)
                .join(" ")}
              data-tour="treasury"
              aria-expanded={isTreasuryOpen}
              aria-controls="treasury-submenu"
              onClick={() =>
                setIsTreasuryOpen(
                  (open) => !open,
                )
              }
            >
              {/* =============================================
                  ICONO TESORERÍA
                  ============================================= */}

              <span
                className="sidebar-treasury-icon-wrap"
                aria-hidden="true"
              >
                <ICONS.tesoreria
                  className="sidebar-nav-icon"
                />

                {isTreasuryOpen && (
                  <svg
                    className="sidebar-treasury-timer"
                    viewBox="0 0 48 48"
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r="22"
                      pathLength="100"
                    />
                  </svg>
                )}
              </span>


              {/* =============================================
                  TEXTO
                  ============================================= */}

              <span className="sidebar-nav-label">
                Tesorería
              </span>


              {/* =============================================
                  CHEVRON
                  ============================================= */}

              <ICONS.expand
                className={[
                  "sidebar-nav-chevron",
                  isTreasuryOpen &&
                    "is-open",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              />


              {/* =============================================
                  TOOLTIP
                  ============================================= */}

              <Tooltip
                content="Tesorería"
                position="right"
                className="sidebar-icon-tooltip"
              />
            </button>


            {/* ===============================================
                SUBMENÚ TESORERÍA
                =============================================== */}

            {isTreasuryOpen && (
              <ul
                id="treasury-submenu"
                className="sidebar-submenu"
              >
                {visibleTreasuryLinks.map(
                  (link) => {
                    const TreasuryIcon =
                      link.icon;

                    const label =
                      currentRole === "USER" &&
                      link.path ===
                        "/tesoreria/stands"
                        ? "Resumen de stands"
                        : link.label;

                    return (
                      <li key={link.path}>
                        <NavLink
                          to={link.path}
                          className={({
                            isActive,
                          }) =>
                            [
                              "sidebar-submenu-link",
                              isActive &&
                                "active",
                            ]
                              .filter(Boolean)
                              .join(" ")
                          }
                          onClick={
                            handleTreasuryLinkClick
                          }
                        >
                          <TreasuryIcon
                            className="sidebar-submenu-icon"
                            aria-hidden="true"
                          />

                          <span>
                            {label}
                          </span>

                          <Tooltip
                            content={label}
                            position="right"
                            className="sidebar-icon-tooltip"
                          />
                        </NavLink>
                      </li>
                    );
                  },
                )}
              </ul>
            )}
          </li>
        )}
      </ul>
    </nav>
  );
};
