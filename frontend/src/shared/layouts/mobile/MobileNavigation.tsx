import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { FiHome, FiGrid, FiBell, FiMoreHorizontal, FiX, FiCalendar, FiGift,
  FiUser, FiSettings, FiLogOut, FiTool, FiBarChart2, FiShield, FiGitBranch,
  FiHeart, FiCamera, FiUsers, FiArrowRight, FiArrowLeft } from "react-icons/fi";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { useOptionalNotifications } from "@/presentation/context/NotificationContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { useArchitectureAccess } from "@/presentation/hooks/architecture/useArchitectureAccess";
import { SIDEBAR_LINKS, TREASURY_LINKS } from "@/shared/constants/Icons";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { lockBodyScroll } from "@/shared/ui/dialog/scrollLock";
import { ImprovementCenter } from "@/presentation/components/improvement-center/ImprovementCenter";
import { OPEN_IMPROVEMENT_CENTER_EVENT } from "@/presentation/context/improvement/ImprovementCenterEvents";
import "./MobileNavigation.css";

const MOBILE_QUERY = "(max-width: 768px)";
const USER_TREASURY = new Set(["/tesoreria/ingresos", "/tesoreria/gastos", "/tesoreria/stands", "/tesoreria/pagos"]);

export const MobileNavigation = () => {
  const auth = useOptionalAuth();
  const notifications = useOptionalNotifications();
  const user = auth?.user;
  const navigate = useNavigate();
  const location = useLocation();
  const moreActive = !["/", "/dashboard", "/notifications"].includes(location.pathname);
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [open, setOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const historyEntry = useRef(false);
  const afterClose = useRef<(() => void) | null>(null);
  const titleId = useId();
  const architecture = useArchitectureAccess(mobile ? user?.id : undefined, mobile ? user?.rol : undefined);
  const admin = isAdminRole(user?.rol);
  const unread = notifications?.unreadCount ?? 0;
  const available = mobile && Boolean(user);

  const close = () => {
    if (historyEntry.current) window.history.back();
    else setOpen(false);
  };
  const perform = (action: () => void) => {
    if (historyEntry.current) { afterClose.current = action; close(); }
    else { setOpen(false); action(); }
  };
  const go = (path: string) => perform(() => {
    navigate(path);
    if (path.includes("#")) requestAnimationFrame(() => document.getElementById(path.split("#")[1])?.scrollIntoView());
  });

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const resize = () => {
      setMobile(media.matches);
      if (!media.matches) {
        if (historyEntry.current) window.history.back();
        setOpen(false);
      }
    };
    const back = () => {
      if (!historyEntry.current) return;
      historyEntry.current = false;
      setOpen(false);
      const action = afterClose.current;
      afterClose.current = null;
      action?.();
    };
    const viewport = window.visualViewport;
    const keyboardChanged = () => {
      const editing = document.activeElement?.matches("input, textarea, select, [contenteditable='true']");
      setKeyboard(Boolean(editing && viewport && window.innerHeight - viewport.height > 150));
    };
    media.addEventListener("change", resize);
    window.addEventListener("popstate", back);
    viewport?.addEventListener("resize", keyboardChanged);
    document.addEventListener("focusout", keyboardChanged);
    return () => {
      media.removeEventListener("change", resize);
      window.removeEventListener("popstate", back);
      viewport?.removeEventListener("resize", keyboardChanged);
      document.removeEventListener("focusout", keyboardChanged);
    };
  }, []);

  useEffect(() => {
    if (!mobile || !user) return;
    document.body.classList.add("has-mobile-navigation");
    return () => document.body.classList.remove("has-mobile-navigation");
  }, [mobile, user]);

  useEffect(() => {
    const panel = dialog.current;
    if (!open || !available || !panel) return;
    panel.showModal();
    const unlock = lockBodyScroll();
    return () => { panel.close(); unlock(); if (trigger.current?.isConnected) trigger.current.focus(); };
  }, [open, available]);

  if (!mobile || !user) return null;
  const menuLink = (path: string, label: string, Icon: typeof FiHome) => (
    <Link key={path} to={path} onClick={event => { event.preventDefault(); go(path); }}>
      <Icon aria-hidden="true" /><span>{label}</span><FiArrowRight aria-hidden="true" />
    </Link>
  );

  return <>
    <ImprovementCenter />
    {createPortal(<>
    <nav className="mobile-navigation" aria-label="Navegación móvil" hidden={keyboard}>
      <NavLink to="/" end><FiHome aria-hidden="true" /><span>Inicio</span></NavLink>
      <NavLink to="/dashboard"><FiGrid aria-hidden="true" /><span>Gestión</span></NavLink>
      <NavLink to="/notifications"><span className="mobile-navigation__icon"><FiBell aria-hidden="true" />
        {unread > 0 && <span className="mobile-navigation__badge" aria-label={`${unread} sin leer`}>{unread > 99 ? "99+" : unread}</span>}
      </span><span>Avisos</span></NavLink>
      <button ref={trigger} type="button" className={moreActive ? "active" : undefined} aria-expanded={open} aria-haspopup="dialog" onClick={() => {
        window.history.pushState({ ...window.history.state, mobileNavigation: true }, "");
        historyEntry.current = true;
        setOpen(true);
      }}><FiMoreHorizontal aria-hidden="true" /><span>Más</span></button>
    </nav>
    <dialog ref={dialog} className="mobile-navigation-sheet" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientY < bounds.top || event.clientX < bounds.left || event.clientX > bounds.right) close();
      }}>
      <div className="mobile-navigation-sheet__handle" aria-hidden="true" />
      <header><div><span>Todo a mano</span><h2 id={titleId}>Explorar</h2></div>
        <button type="button" aria-label="Cerrar navegación" onClick={close}><FiX aria-hidden="true" /></button></header>
      <div className="mobile-navigation-sheet__scroll">
        <button type="button" className="mobile-navigation-sheet__account" onClick={() => go("/profile")}>
          <UserAvatar user={user} className="mobile-navigation-sheet__avatar" />
          <span><strong>{user.nombre}</strong><small>Ver mi perfil</small></span><FiArrowRight aria-hidden="true" />
        </button>
        <section><h3>Tu comunidad</h3><div className="mobile-navigation-sheet__links">
          {menuLink("/calendario/horario-clases", "Horario de clases", FiCalendar)}
          {menuLink("/birthdays", "Cumpleaños", FiGift)}
          {menuLink("/#sobre-nosotros", "Lo que nos mueve", FiHeart)}
          {menuLink("/#fotos-del-curso", "Fotos del curso", FiCamera)}
          {menuLink("/#directiva", "Directiva", FiUsers)}
        </div></section>
        <section><h3>Tesorería</h3><div className="mobile-navigation-sheet__links">
          {TREASURY_LINKS.filter(link => admin || USER_TREASURY.has(link.path)).map(link =>
            menuLink(link.path, user.rol === "USER" && link.path === "/tesoreria/stands" ? "Resumen de stands" : link.label, link.icon))}
        </div></section>
        {admin && <section><h3>Gestión del curso</h3><div className="mobile-navigation-sheet__links">
          {SIDEBAR_LINKS.flatMap(section => section.links).filter(link => ["/users", "/parents", "/students", "/family"].includes(link.path))
            .map(link => menuLink(link.path, link.label, link.icon))}
          {menuLink("/admin/horario-clases", "Gestionar horario", FiCalendar)}
          {menuLink("/admin/sobre-nosotros", "Editar presentación", FiHeart)}
          {menuLink("/admin/fotos-del-curso", "Gestionar fotos", FiCamera)}
          {menuLink("/admin/directiva", "Gestionar directiva", FiUsers)}
        </div></section>}
        {admin && <section><h3>Administración</h3><div className="mobile-navigation-sheet__links">
          {user.rol === "SUPER_ADMIN" && menuLink("/administrations", "Administraciones", FiShield)}
          {user.rol === "SUPER_ADMIN" && architecture.allowed && menuLink("/admin/arquitectura", "Arquitectura del sistema", FiGitBranch)}
          {menuLink("/admin/mejoras", "Gestión de mejoras", FiTool)}
          {menuLink("/admin/reportes-calidad", "Reportes de calidad", FiBarChart2)}
        </div></section>}
        <section><h3>Mi cuenta</h3><div className="mobile-navigation-sheet__links">
          {menuLink("/profile", "Mi perfil", FiUser)}
          {menuLink("/configuration", "Configuración", FiSettings)}
          <button type="button" onClick={() => perform(() => window.dispatchEvent(new Event(OPEN_IMPROVEMENT_CENTER_EVENT)))}>
            <FiTool aria-hidden="true" /><span>Enviar una mejora</span><FiArrowRight aria-hidden="true" /></button>
          <button type="button" className="mobile-navigation-sheet__logout" onClick={() => perform(() => { void auth?.logout(); })}>
            <FiLogOut aria-hidden="true" /><span>Cerrar sesión</span></button>
        </div></section>
      </div>
      <footer><button type="button" onClick={close}><FiArrowLeft aria-hidden="true" />Volver a la pantalla</button></footer>
    </dialog>
  </>, document.body)}
  </>;
};
