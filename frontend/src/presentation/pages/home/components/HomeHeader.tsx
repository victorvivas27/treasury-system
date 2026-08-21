import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiCamera, FiEdit3, FiHeart, FiLogIn, FiLogOut, FiMail, FiUsers,
  FiUserPlus } from "react-icons/fi";
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

  const sectionProps = (section: string) => ({
    className: activeSection === section ? "is-active" : undefined,
    onClick: () => setActiveSection(section),
    "aria-current": activeSection === section ? "location" as const : undefined,
  });

  return (
  <header className="public-home__header">
    {isAuthenticated ? <Link className="public-home__account" to="/profile"
      aria-label={`Ver perfil de ${user?.nombre ?? "Usuario"}`}>
      <UserAvatar user={user ?? null} className="public-home__account-avatar" />
      <span>{user?.nombre ?? "Usuario"}</span>
    </Link> : <Link className="public-home__brand" to="/" aria-label="Sistema de Tesorería, inicio">
      <BrandLogo alt="" />
      <span>Sistema de Tesorería</span>
    </Link>}
    <nav className={`public-home__nav ${isAuthenticated ? "is-authenticated" : ""}`}
      aria-label={isAuthenticated ? "Navegación de la comunidad" : "Acceso a la plataforma"}>
      {isAuthenticated ? <>
        {isAdmin ? <Link to="/admin/sobre-nosotros">
          <FiEdit3 aria-hidden="true" /> Editar Lo que nos mueve
        </Link>
          : <a href="#sobre-nosotros" {...sectionProps("sobre-nosotros")}>
            <FiHeart aria-hidden="true" /> Lo que nos mueve</a>}
        <a href="#fotos-del-curso" {...sectionProps("fotos-del-curso")}>
          <FiCamera aria-hidden="true" /> Fotos del curso</a>
        <a href="#contacto" {...sectionProps("contacto")}><FiMail aria-hidden="true" /> Contacto</a>
        <a href="#directiva" {...sectionProps("directiva")}><FiUsers aria-hidden="true" /> Directiva</a>
        <Link className="public-home__system-access" to="/dashboard">
          <BrandLogo className="public-home__system-access-logo" alt="" />
          <span>Sistema</span>
        </Link>
        <button className="public-home__logout" type="button" onClick={onLogout}>
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
