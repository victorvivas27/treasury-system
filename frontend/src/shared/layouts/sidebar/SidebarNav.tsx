import {
  ICONS,
  SIDEBAR_LINKS,
  TREASURY_LINKS,
} from "@/shared/constants/Icons";

import "./style/SidebarNav.css";
import { FiCalendar, FiCamera, FiHeart, FiUsers } from "react-icons/fi";

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
  isCollapsed?: boolean;
  onExpandSidebar?: () => void;
}


const ADMIN_PATHS = new Set([
  "/users",
  "/students",
  "/parents",
  "/family",
]);

const MANAGEMENT_PATHS = new Set([
  "/parents",
  "/students",
  "/family",
  "/users",
]);


const USER_TREASURY_PATHS = new Set([
  "/tesoreria/ingresos",
  "/tesoreria/gastos",
  "/tesoreria/stands",
  "/tesoreria/pagos",
]);




export const SidebarNav = ({
  onNavLinkClick,
  role,
  isCollapsed = true,
  onExpandSidebar,
}: SidebarNavProps) => {
  const auth = useOptionalAuth();

  const currentRole =
    role ?? auth?.user?.rol;

  const location = useLocation();
  type MenuGroup = "management" | "academic" | "treasury";
  const [openGroup, setOpenGroup] = useState<MenuGroup | null>(null);
  const isManagementOpen = openGroup === "management";
  const isAcademicOpen = openGroup === "academic";
  const isTreasuryOpen = openGroup === "treasury";
  const toggleGroup = (group: MenuGroup) => {
    if (isCollapsed) onExpandSidebar?.();
    setOpenGroup(current => current === group ? null : group);
  };

  useEffect(() => {
    if (!openGroup) return;
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(`.sidebar-nav-section--${openGroup}`)) {
        setOpenGroup(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      document.querySelector<HTMLButtonElement>(`[aria-controls="${openGroup}-submenu"]`)?.focus();
      setOpenGroup(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openGroup]);

  useEffect(() => {
    if (isCollapsed) setOpenGroup(null);
  }, [isCollapsed]);

  /* =========================================================
     LINKS VISIBLES DE TESORERÍA
     ========================================================= */

  const visibleTreasuryLinks =
    isAdminRole(currentRole)
      ? TREASURY_LINKS
      : TREASURY_LINKS.filter((link) =>
          USER_TREASURY_PATHS.has(link.path),
        );

  const visibleMainLinks = SIDEBAR_LINKS.flatMap((section) =>
    section.links.filter(
      (link) =>
        !MANAGEMENT_PATHS.has(link.path) &&
        (
          isAdminRole(currentRole) ||
          !ADMIN_PATHS.has(link.path)
        ),
    ),
  );

  visibleMainLinks.sort((a, b) => Number(b.path === "/dashboard") - Number(a.path === "/dashboard"));

  const visibleManagementLinks = SIDEBAR_LINKS.flatMap((section) =>
    section.links.filter(
      (link) =>
        MANAGEMENT_PATHS.has(link.path) &&
        isAdminRole(currentRole),
    ),
  );
  if (isAdminRole(currentRole)) visibleManagementLinks.push(
    { path: "/admin/horario-clases", label: "Gestión del horario", icon: FiCalendar },
    { path: "/admin/sobre-nosotros", label: "Lo que nos mueve", icon: FiHeart },
    { path: "/admin/fotos-del-curso", label: "Fotos del curso", icon: FiCamera },
    { path: "/admin/directiva", label: "Directiva", icon: FiUsers },
  );

  const isManagementActive = visibleManagementLinks.some((link) =>
    location.pathname.startsWith(link.path),
  );


  /* =========================================================
     CLICK DE NAVEGACIÓN NORMAL
     ========================================================= */

  const handleClick = () => {
    onNavLinkClick();
  };




  /* =========================================================
     CLICK LINK TESORERÍA
     ========================================================= */

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <nav
      aria-label="Navegación principal"
      className={[
        "sidebar-nav",
        openGroup && "sidebar-nav--group-open",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ul className="sidebar-nav-ul">

        {/* ===================================================
            LINKS PRINCIPALES
            =================================================== */}

        <li className="sidebar-nav-section">
          <ul>
            {visibleMainLinks.map((link) => {
              const Icon = link.icon;

              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    aria-label={link.label}
                    data-tour-path={link.path}
                    className={({ isActive }) =>
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
        </li>

        {visibleManagementLinks.length > 0 && (
          <li
            className="
              sidebar-nav-section
              sidebar-nav-section--management
            "
          >
            <button
              type="button"
              className={[
                "sidebar-nav-link-item",
                "sidebar-nav-parent",
                isManagementActive && "active",
                isManagementOpen && "is-open",
              ]
                .filter(Boolean)
                .join(" ")}
              data-tour="management"
              aria-label="Gestión"
              aria-expanded={isManagementOpen}
              aria-controls="management-submenu"
              onClick={() => toggleGroup("management")}
            >
              <span
                className="sidebar-treasury-icon-wrap"
                aria-hidden="true"
              >
                <ICONS.crearFamilia
                  className="sidebar-nav-icon"
                />
              </span>

              <span className="sidebar-nav-label">
                Gestión
              </span>

              <ICONS.expand
                className={[
                  "sidebar-nav-chevron",
                  isManagementOpen && "is-open",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              />

              <Tooltip disabled={!isCollapsed}
                content="Gestión"
                position="right"
                className="sidebar-icon-tooltip"
              />
            </button>

            {isManagementOpen && (
              <ul
                id="management-submenu"
                className="sidebar-submenu"
              >
                {visibleManagementLinks.map((link) => {
                  const ManagementIcon = link.icon;

                  return (
                    <li key={link.path}>
                      <NavLink
                        to={link.path}
                        data-tour-path={link.path}
                        className={({ isActive }) =>
                          [
                            "sidebar-submenu-link",
                            isActive && "active",
                          ]
                            .filter(Boolean)
                            .join(" ")
                        }
                        onClick={handleClick}
                      >
                        <ManagementIcon
                          className="sidebar-submenu-icon"
                          aria-hidden="true"
                        />

                        <span>{link.label}</span>


                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        )}

        {currentRole && <li className="sidebar-nav-section sidebar-nav-section--academic">
          <button type="button"
            className={["sidebar-nav-link-item", "sidebar-nav-parent",
              location.pathname.startsWith("/calendario") && "active", isAcademicOpen && "is-open"].filter(Boolean).join(" ")}
            aria-label="Calendario Académico" aria-expanded={isAcademicOpen} aria-controls="academic-submenu"
            onClick={() => toggleGroup("academic")}>
            <span className="sidebar-treasury-icon-wrap" aria-hidden="true">
              <FiCalendar className="sidebar-nav-icon" />
            </span>
            <span className="sidebar-nav-label">Calendario Académico</span>
            <ICONS.expand className={["sidebar-nav-chevron", isAcademicOpen && "is-open"].filter(Boolean).join(" ")} aria-hidden="true" />
            <Tooltip disabled={!isCollapsed} content="Calendario Académico" position="right" className="sidebar-icon-tooltip" />
          </button>
          {isAcademicOpen && <ul id="academic-submenu" className="sidebar-submenu">
            <li><NavLink to="/calendario/horario-clases"
              className={({ isActive }) => ["sidebar-submenu-link", isActive && "active"].filter(Boolean).join(" ")}
              onClick={handleClick}>
              <FiCalendar className="sidebar-submenu-icon" aria-hidden="true" /><span>Horario de clases</span>

            </NavLink></li>
            <li><span className="sidebar-submenu-link" aria-disabled="true">
              <FiCalendar className="sidebar-submenu-icon" aria-hidden="true" /><span>Evaluaciones · Próximamente</span>

            </span></li>
          </ul>}
        </li>}


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
              aria-label="Tesorería"
              aria-expanded={isTreasuryOpen}
              aria-controls="treasury-submenu"
              onClick={() => toggleGroup("treasury")}
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

              <Tooltip disabled={!isCollapsed}
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
                            handleClick
                          }
                        >
                          <TreasuryIcon
                            className="sidebar-submenu-icon"
                            aria-hidden="true"
                          />

                          <span>
                            {label}
                          </span>


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
