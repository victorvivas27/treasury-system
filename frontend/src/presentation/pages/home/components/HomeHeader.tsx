import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiCamera, FiEdit3, FiHeart, FiLogIn, FiLogOut, FiMail, FiMenu, FiUsers,
  FiUserPlus, FiX } from "react-icons/fi";
import type { User } from "@/core/A-domain/entities/user/User";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import "../style/HomeHeader.css";

export const HomeHeader = ({ isAuthenticated = false, isAdmin = false, user, onLogout }: {
  isAuthenticated?: boolean; isAdmin?: boolean;
  user?: Pick<User, "nombre" | "profileImageType" | "profileImageUrl"> | null;
  onLogout?: () => void;
}) => {
  const [activeSection, setActiveSection] = useState("sobre-nosotros");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !("IntersectionObserver" in window)) return;
    const sectionIds = ["sobre-nosotros", "fotos-del-curso", "contacto", "directiva"];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-25% 0px -60%", threshold: 0 });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const sectionProps = (section: string) => ({
    className: activeSection === section ? "is-active" : undefined,
    onClick: () => {
      setActiveSection(section);
      closeMobileMenu();
    },
    "aria-current": activeSection === section ? "location" as const : undefined,
  });

  return (
  <header className="public-home__header">
    {isAuthenticated ? <Link className="public-home__account" to="/profile" onClick={closeMobileMenu}
      aria-label={`Ver perfil de ${user?.nombre ?? "Usuario"}`}>
      <UserAvatar user={user ?? null} className="public-home__account-avatar" />
      <span>{user?.nombre ?? "Usuario"}</span>
    </Link> : <Link className="public-home__brand" to="/" aria-label="Sistema de Tesorería, inicio">
      <BrandLogo alt="" />
      <span>Sistema de Tesorería</span>
    </Link>}
    {isAuthenticated && <button className="public-home__menu-toggle" type="button"
      aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
      aria-expanded={isMobileMenuOpen} aria-controls="public-home-menu"
      onClick={() => setIsMobileMenuOpen(isOpen => !isOpen)}>
      {isMobileMenuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
    </button>}
    <nav id={isAuthenticated ? "public-home-menu" : undefined}
      className={`public-home__nav ${isAuthenticated ? "is-authenticated" : ""} ${isMobileMenuOpen ? "is-open" : ""}`}
      aria-label={isAuthenticated ? "Navegación de la comunidad" : "Acceso a la plataforma"}>
      {isAuthenticated ? <>
        {isAdmin ? <Link to="/admin/sobre-nosotros" onClick={closeMobileMenu}>
          <FiEdit3 aria-hidden="true" /> Editar Lo que nos mueve
        </Link>
          : <a href="#sobre-nosotros" {...sectionProps("sobre-nosotros")}>
            <FiHeart aria-hidden="true" /> Lo que nos mueve</a>}
        <a href="#fotos-del-curso" {...sectionProps("fotos-del-curso")}>
          <FiCamera aria-hidden="true" /> Fotos del curso</a>
        <a href="#contacto" {...sectionProps("contacto")}><FiMail aria-hidden="true" /> Contacto</a>
        <a href="#directiva" {...sectionProps("directiva")}><FiUsers aria-hidden="true" /> Directiva</a>
        <Link className="public-home__system-access" to="/dashboard" onClick={closeMobileMenu}>
          <BrandLogo className="public-home__system-access-logo" alt="" />
          <span>Sistema</span>
        </Link>
        <button className="public-home__logout" type="button" onClick={() => {
          closeMobileMenu();
          onLogout?.();
        }}>
          <FiLogOut aria-hidden="true" /> Cerrar sesión
        </button>
      </> : <>
        <Link className="public-home__login" to="/login">
          <FiLogIn aria-hidden="true" /> Iniciar sesión
        </Link>
        <Link className="public-home__register" to="/register">
          <FiUserPlus aria-hidden="true" /> Crear cuenta
        </Link>
      </>}
    </nav>
  </header>
  );
};
