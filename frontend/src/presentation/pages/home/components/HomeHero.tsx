import { FiCheckCircle, FiShield } from "react-icons/fi";
import { Link } from "react-router-dom";
import { FiBattery, FiWifi } from "react-icons/fi";
import { HomeDashboardPreview } from "./HomeDashboardPreview";
import "../style/HomeHero.css";

export const HomeHero = () => (
  <section className="public-home__hero">
    <div className="public-home__hero-copy public-home__hero-enter">
      <span className="public-home__eyebrow"><FiShield aria-hidden="true" />Tesorería y comunidad escolar</span>
      <h1 className="public-home__animated-title">Cada aporte cuenta.<br />Todo tu curso conectado.</h1>
      <p className="public-home__animated-description">
        Desde la cuota anual hasta la actividad de fin de año: organiza familias,
        registra pagos y gastos, y sigue lo que están construyendo juntos.
      </p>
      <div className="public-home__hero-actions">
        <a className="home-tour__button" href="#casos-reales">Descubre cómo funciona <span aria-hidden="true">↓</span></a>
        <Link to="/login">Entrar a mi curso <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="public-home__trust">
        <span><FiCheckCircle aria-hidden="true" /> Familias y directiva</span>
        <span><FiCheckCircle aria-hidden="true" /> Desde tu celular</span>
      </div>
    </div>
    <div className="home-dashboard-device">
      <div className="home-dashboard-device__status" aria-hidden="true">
        <span>9:41</span><i /><span><FiWifi /><FiBattery /></span>
      </div>
      <HomeDashboardPreview />
      <div className="home-dashboard-device__home" aria-hidden="true"><span /></div>
    </div>
  </section>
);
