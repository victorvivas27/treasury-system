import { Link } from "react-router-dom";
import { FiLogIn, FiUserPlus } from "react-icons/fi";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import "../style/HomeHeader.css";

export const HomeHeader = () => (
  <header className="public-home__header">
    <Link className="public-home__brand" to="/" aria-label="Sistema de Tesorería, inicio">
      <BrandLogo alt="" />
      <span>Sistema de Tesorería</span>
    </Link>
    <nav className="public-home__nav" aria-label="Acceso a la plataforma">
      <Link className="public-home__login" to="/login">
        <FiLogIn aria-hidden="true" /> Iniciar sesión
      </Link>
      <Link className="public-home__register" to="/register">
        <FiUserPlus aria-hidden="true" /> Crear cuenta
      </Link>
    </nav>
  </header>
);
