import {
  ICONS,
  SIDEBAR_LINKS,
  TREASURY_LINKS,
} from "@/shared/constants/Icons";

import "./style/SidebarNav.css";
import { FiCalendar } from "react-icons/fi";
import { useArchitectureAccess } from "@/presentation/hooks/architecture/useArchitectureAccess";

import {
  NavLink,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
  useState,
  useRef,
  type FocusEvent,
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

const MANAGEMENT_PATHS = new Set([
  "/parents",
  "/students",
  "/family",
  "/users",
  "/admin/mejoras",
]);


const USER_TREASURY_PATHS = new Set([
  "/tesoreria/ingresos",
  "/tesoreria/gastos",
  "/tesoreria/stands",
  "/tesoreria/pagos",
]);


const MENU_AUTO_CLOSE_MS = 6000;


export const SidebarNav = ({
  onNavLinkClick,
  role,
}: SidebarNavProps) => {
  const auth = useOptionalAuth();

  const currentRole =
    role ?? auth?.user?.rol;
  const architectureAccess = useArchitectureAccess(auth?.user?.id, currentRole);

  const location = useLocation();
  type MenuGroup = "management" | "academic" | "treasury";
  const [openGroup, setOpenGroup] = useState<MenuGroup | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<MenuGroup | null>(null);
  const [focusedGroup, setFocusedGroup] = useState<MenuGroup | null>(null);
  const remainingTime = useRef(MENU_AUTO_CLOSE_MS);
  const timedGroup = useRef<MenuGroup | null>(null);
  const isManagementOpen = openGroup === "management";
  const isAcademicOpen = openGroup === "academic";
  const isTreasuryOpen = openGroup === "treasury";
  const isPaused = openGroup !== null && (hoveredGroup === openGroup || focusedGroup === openGroup);

  const toggleGroup = (group: MenuGroup) => {
    setFocusedGroup(document.activeElement?.closest(`.sidebar-nav-section--${group}`) ? group : null);
    setOpenGroup(current => current === group ? null : group);
  };

  const groupInteraction = (group: MenuGroup) => ({
    onPointerEnter: () => setHoveredGroup(group),
    onPointerLeave: () => setHoveredGroup(null),
    onFocus: () => setFocusedGroup(group),
    onBlur: (event: FocusEvent<HTMLLIElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedGroup(null);
    },
  });

  const renderTimer = () => <svg className="sidebar-treasury-timer" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="22" pathLength="100"
      style={{ animationPlayState: isPaused ? "paused" : "running" }} />
  </svg>;

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

  const visibleManagementLinks = SIDEBAR_LINKS.flatMap((section) =>
    section.links.filter(
      (link) =>
        MANAGEMENT_PATHS.has(link.path) &&
        isAdminRole(currentRole),
    ),
  );
  if (architectureAccess.allowed) visibleManagementLinks.push({
    path: "/admin/arquitectura", label: "Arquitectura del sistema", icon: ICONS.dashboard,
  });
  if (isAdminRole(currentRole)) visibleManagementLinks.push({
    path: "/admin/horario-clases", label: "Gestión del horario", icon: FiCalendar,
  });

  const isManagementActive = visibleManagementLinks.some((link) =>
    location.pathname.startsWith(link.path),
  );


  /* =========================================================
     CLICK DE NAVEGACIÓN NORMAL
     ========================================================= */

  const handleClick = () => {
    setOpenGroup(null);
    onNavLinkClick();
  };


  /* =========================================================
     AUTO CLOSE TESORERÍA
     ========================================================= */

  useEffect(() => {
    if (timedGroup.current !== openGroup) {
      timedGroup.current = openGroup;
      remainingTime.current = MENU_AUTO_CLOSE_MS;
    }
    if (!openGroup || isPaused) return;
    const startedAt = performance.now();
    const timer = window.setTimeout(() => setOpenGroup(null), remainingTime.current);
    return () => {
      window.clearTimeout(timer);
      remainingTime.current = Math.max(0, remainingTime.current - (performance.now() - startedAt));
    };
  }, [openGroup, isPaused]);


  /* =========================================================
     CLICK LINK TESORERÍA
     ========================================================= */

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <nav
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

        {visibleManagementLinks.length > 0 && (
          <li
            className="
              sidebar-nav-section
              sidebar-nav-section--management
            "
            {...groupInteraction("management")}
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

                {isManagementOpen && renderTimer()}
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

              <Tooltip
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
            )}
          </li>
        )}

        {currentRole && <li className="sidebar-nav-section sidebar-nav-section--academic" {...groupInteraction("academic")}>
          <button type="button"
            className={["sidebar-nav-link-item", "sidebar-nav-parent",
              location.pathname.startsWith("/calendario") && "active", isAcademicOpen && "is-open"].filter(Boolean).join(" ")}
            aria-expanded={isAcademicOpen} aria-controls="academic-submenu"
            onClick={() => toggleGroup("academic")}>
            <span className="sidebar-treasury-icon-wrap" aria-hidden="true">
              <FiCalendar className="sidebar-nav-icon" />
              {isAcademicOpen && renderTimer()}
            </span>
            <span className="sidebar-nav-label">Calendario Académico</span>
            <ICONS.expand className={["sidebar-nav-chevron", isAcademicOpen && "is-open"].filter(Boolean).join(" ")} aria-hidden="true" />
            <Tooltip content="Calendario Académico" position="right" className="sidebar-icon-tooltip" />
          </button>
          {isAcademicOpen && <ul id="academic-submenu" className="sidebar-submenu">
            <li><NavLink to="/calendario/horario-clases"
              className={({ isActive }) => ["sidebar-submenu-link", isActive && "active"].filter(Boolean).join(" ")}
              onClick={handleClick}>
              <FiCalendar className="sidebar-submenu-icon" aria-hidden="true" /><span>Horario de clases</span>
              <Tooltip content="Horario de clases" position="right" className="sidebar-icon-tooltip" />
            </NavLink></li>
            <li><span className="sidebar-submenu-link" aria-disabled="true">
              <FiCalendar className="sidebar-submenu-icon" aria-hidden="true" /><span>Evaluaciones · Próximamente</span>
              <Tooltip content="Evaluaciones · Próximamente" position="right" className="sidebar-icon-tooltip" />
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
            {...groupInteraction("treasury")}
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

                {isTreasuryOpen && renderTimer()}
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
