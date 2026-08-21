import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiCheckCircle, FiClock, FiDollarSign, FiLogIn,
  FiShield, FiUserPlus, FiUsers } from "react-icons/fi";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import "../style/HomeHero.css";

const AnimatedNumber = ({ value, currency = false, suffix = "" }: {
  value: number;
  currency?: boolean;
  suffix?: string;
}) => {
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
  return <strong ref={elementRef}>{currency ? `$ ${formatted}` : formatted}{suffix}</strong>;
};

export const HomeHero = ({ isAuthenticated = false }: { isAuthenticated?: boolean }) => (
  <section className="public-home__hero">
    <div className="public-home__hero-copy public-home__hero-enter">
      <span className="public-home__eyebrow"><FiShield aria-hidden="true" />Gestión simple y segura</span>
      <h1 className="public-home__animated-title">Las finanzas de tu curso, claras y ordenadas</h1>
      <p className="public-home__animated-description">
        Una plataforma pensada para que apoderados y directiva administren cuotas, actividades y
        gastos del curso con total transparencia.
      </p>
      <div className="public-home__actions">
        <Link className="public-home__primary-action" to={isAuthenticated ? "/dashboard" : "/register"}>
          {isAuthenticated ? <>
            <BrandLogo className="public-home__system-access-logo" alt="" />
            <span>Sistema</span>
          </> : <>
          <FiUserPlus aria-hidden="true" /> Crear cuenta
          </>}
        </Link>
        {isAuthenticated ? <a className="public-home__secondary-action" href="#sobre-nosotros">
          Conocer nuestro curso
        </a> : <Link className="public-home__secondary-action" to="/login">
          <FiLogIn aria-hidden="true" /> Iniciar sesión
        </Link>}
      </div>
      <div className="public-home__trust">
        <span><FiCheckCircle aria-hidden="true" /> Fácil de usar</span>
        <span><FiCheckCircle aria-hidden="true" /> Cuentas transparentes</span>
      </div>
    </div>

    <div className="public-home__preview public-home__preview-enter" data-home-preview-reveal
      aria-label="Vista previa del dashboard con datos de muestra">
      <div className="public-home__preview-top">
        <div><strong>Dashboard</strong><span>Estado financiero del curso</span></div>
        <div className="public-home__preview-year"><span>Año escolar</span><strong>2026⌄</strong></div>
      </div>
      <span className="public-home__sample-badge">Datos de muestra</span>
      <div className="public-home__dashboard-kpis">
        <article><span><FiUsers /> Familias activas</span><AnimatedNumber value={32} /></article>
        <article className="is-featured"><span><FiDollarSign /> Saldo disponible</span>
          <AnimatedNumber value={1240000} currency /></article>
        <article className="is-positive"><span><FiDollarSign /> Ingresos totales</span>
          <AnimatedNumber value={1680000} currency /></article>
        <article className="is-pending"><span><FiClock /> Cuotas pendientes</span>
          <AnimatedNumber value={7} /></article>
      </div>
      <div className="public-home__dashboard-panels">
        <article className="public-home__cashflow">
          <header><span>Flujo mensual</span><strong>Ingresos extraordinarios y egresos</strong></header>
          <svg viewBox="0 0 300 105" role="img" aria-label="Gráfico de flujo mensual de muestra">
            <path className="grid" d="M0 20H300M0 50H300M0 80H300" />
            <path className="income-area" d="M0 88 C35 82 45 50 75 61 S120 28 150 43 S198 72 225 38 S270 18 300 25 V105 H0Z" />
            <path className="income-line" d="M0 88 C35 82 45 50 75 61 S120 28 150 43 S198 72 225 38 S270 18 300 25" />
            <path className="expense-line" d="M0 94 C45 90 55 76 90 83 S142 65 175 76 S225 59 260 69 S285 60 300 64" />
          </svg>
          <div className="public-home__chart-legend"><span className="income">Ingresos</span><span className="expense">Egresos</span></div>
        </article>
        <article className="public-home__quota-preview">
          <header><span>Cuota anual</span><strong>Avance de recaudación</strong></header>
          <div className="public-home__quota-value"><AnimatedNumber value={78} suffix="%" /><span>recaudado</span></div>
          <div className="public-home__quota-track"><span /></div>
          <small>25 de 32 cuotas pagadas</small>
        </article>
      </div>
      <div className="public-home__preview-movement">
        <span>Último registro</span><strong>Rifa escolar</strong><b>+$ 100.000</b>
      </div>
    </div>
  </section>
);
