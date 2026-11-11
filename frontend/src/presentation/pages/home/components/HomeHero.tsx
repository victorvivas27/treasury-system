import { FiCheckCircle, FiShield } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { HomeDashboardPreview } from "./HomeDashboardPreview";
import "../style/HomeHero.css";

export const HomeHero = () => {
  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => {
    let frame = 0;
    const reveal = () => {
      if (document.getElementById('app-boot-loader')) return;
      observer.disconnect();
      frame = requestAnimationFrame(() => setMotionReady(true));
    };
    const observer = new MutationObserver(reveal);
    observer.observe(document.body, { childList: true });
    reveal();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  return (
  <section className={`public-home__hero${motionReady ? ' is-hero-ready' : ''}`}>
    <div className="public-home__hero-background" aria-hidden="true" inert>
      <HomeDashboardPreview ambient />
    </div>
    <div className="public-home__hero-copy public-home__hero-enter">
      <span className="public-home__eyebrow"><FiShield aria-hidden="true" />Tesorería y comunidad escolar</span>
      <h1 className="public-home__animated-title"><span>Cada aporte cuenta.</span><span>Todo tu curso conectado.</span></h1>
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
  </section>
  );
};
