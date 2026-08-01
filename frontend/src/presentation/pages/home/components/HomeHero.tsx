import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCalendar, FiCheckCircle, FiDollarSign, FiFileText,
  FiShield, FiUsers } from "react-icons/fi";
import "../style/HomeHero.css";

const modules = [
  { icon: FiCalendar, label: "Cuotas del curso" },
  { icon: FiDollarSign, label: "Ingresos y gastos" },
  { icon: FiFileText, label: "Rendiciones" },
  { icon: FiUsers, label: "Apoderados" },
];

const AnimatedNumber = ({ value, currency = false }: { value: number; currency?: boolean }) => {
  const elementRef = useRef<HTMLElement>(null);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(animationFrame);
      if (!entry.isIntersecting) {
        if (!reduceMotion) setDisplayed(0);
        return;
      }
      if (reduceMotion) {
        setDisplayed(value);
        return;
      }
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / 1300, 1);
        setDisplayed(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }, { threshold: 0.45 });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [value]);

  const formatted = new Intl.NumberFormat("es-CL").format(displayed);
  return <strong ref={elementRef}>{currency ? `$ ${formatted}` : formatted}</strong>;
};

export const HomeHero = () => (
  <section className="public-home__hero">
    <div className="public-home__hero-copy public-home__hero-enter">
      <span className="public-home__eyebrow"><FiShield aria-hidden="true" />Gestión simple y segura</span>
      <h1 className="public-home__animated-title">Las finanzas de tu curso, claras y ordenadas</h1>
      <p className="public-home__animated-description">
        Una plataforma pensada para que apoderados y directiva administren cuotas, actividades y
        gastos del curso con total transparencia.
      </p>
      <div className="public-home__actions">
        <Link className="public-home__primary-action" to="/register">
          Crear cuenta <FiArrowRight aria-hidden="true" />
        </Link>
        <Link className="public-home__secondary-action" to="/login">Iniciar sesión</Link>
      </div>
      <div className="public-home__trust">
        <span><FiCheckCircle aria-hidden="true" /> Fácil de usar</span>
        <span><FiCheckCircle aria-hidden="true" /> Cuentas transparentes</span>
      </div>
    </div>

    <div className="public-home__preview public-home__preview-enter" data-home-preview-reveal
      aria-label="Vista previa de la plataforma">
      <div className="public-home__preview-top">
        <div><span>Curso de muestra</span><strong>Resumen de la tesorería</strong></div>
        <span className="public-home__preview-status">Demo</span>
      </div>
      <div className="public-home__stats">
        <article><span>Fondos del curso</span><AnimatedNumber value={1240000} currency />
          <small>Saldo disponible</small></article>
        <article><span>Cuotas registradas</span><AnimatedNumber value={32} />
          <small>Apoderados al día</small></article>
      </div>
      <div className="public-home__chart" aria-hidden="true">
        <div className="public-home__chart-header"><span>Recaudación mensual</span><span>Año escolar</span></div>
        <div className="public-home__bars">
          {[44, 62, 53, 78, 66, 88].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
      <div className="public-home__module-list">
        {modules.map(({ icon: Icon, label }) => (
          <span key={label}><Icon aria-hidden="true" />{label}</span>
        ))}
      </div>
    </div>
  </section>
);
