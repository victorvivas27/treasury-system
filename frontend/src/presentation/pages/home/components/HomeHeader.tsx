import { Link } from "react-router-dom";
import { FiGrid, FiLogIn, FiUserPlus } from "react-icons/fi";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import "../style/HomeHeader.css";

export const HomeHeader = ({ isAuthenticated = false, isAdmin = false }: {
  isAuthenticated?: boolean; isAdmin?: boolean;
}) => (
  <header className="public-home__header">
    <Link className="public-home__brand" to="/" aria-label="Sistema de Tesorería, inicio">
      <BrandLogo alt="" />
      <span>Sistema de Tesorería</span>
    </Link>
    <nav className={`public-home__nav ${isAuthenticated ? "is-authenticated" : ""}`}
      aria-label={isAuthenticated ? "Navegación de la comunidad" : "Acceso a la plataforma"}>
      {isAuthenticated ? <>
        {isAdmin ? <Link to="/admin/sobre-nosotros">Administrar Sobre nosotros</Link>
          : <a href="#sobre-nosotros">Sobre nosotros</a>}
        <a href="#fotos-del-curso">Fotos del curso</a>
        <a href="#contacto">Contacto</a>
        <a href="#directiva">Directiva</a>
        <Link className="public-home__register" to="/dashboard">
          <FiGrid aria-hidden="true" /> Ir al sistema
        </Link>
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
