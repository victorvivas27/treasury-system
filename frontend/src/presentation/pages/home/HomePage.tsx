import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiCode,
  FiDollarSign,
  FiFileText,
  FiMail,
  FiPhone,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import "./HomePage.css";

const features = [
  {
    icon: FiDollarSign,
    title: "Cuotas al día",
    description: "Registra las cuotas del curso y mantén un seguimiento claro de los pagos.",
  },
  {
    icon: FiUsers,
    title: "Apoderados informados",
    description: "Comparte información financiera clara con las familias del curso.",
  },
  {
    icon: FiBarChart2,
    title: "Rendición transparente",
    description: "Entrega a la directiva resúmenes de ingresos, gastos y actividades.",
  },
];

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
      const duration = 1300;
      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayed(Math.round(value * eased));
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

export const HomePage = () => {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      "[data-home-reveal], [data-home-footer-reveal], [data-home-preview-reveal]",
    );
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="public-home">
      <header className="public-home__header">
        <Link className="public-home__brand" to="/" aria-label="Tesorería, inicio">
          <img src="/icono_tesoreria_03.png" alt="" />
          <span>Tesorería</span>
        </Link>

        <nav className="public-home__nav" aria-label="Acceso a la plataforma">
          <Link className="public-home__login" to="/login">
            Iniciar sesión
          </Link>
          <Link className="public-home__register" to="/register">
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main>
        <section className="public-home__hero">
          <div className="public-home__hero-copy public-home__hero-enter">
            <span className="public-home__eyebrow">
              <FiShield aria-hidden="true" />
              Gestión simple y segura
            </span>
            <h1 className="public-home__animated-title">
              Las finanzas de tu curso, claras y ordenadas
            </h1>
            <p className="public-home__animated-description">
              Una plataforma pensada para que apoderados y directiva administren
              cuotas, actividades y gastos del curso con total transparencia.
            </p>
            <div className="public-home__actions">
              <Link className="public-home__primary-action" to="/register">
                Comenzar ahora
                <FiArrowRight aria-hidden="true" />
              </Link>
              <Link className="public-home__secondary-action" to="/login">
                Ya tengo una cuenta
              </Link>
            </div>
            <div className="public-home__trust">
              <span><FiCheckCircle aria-hidden="true" /> Fácil de usar</span>
              <span><FiCheckCircle aria-hidden="true" /> Cuentas transparentes</span>
            </div>
          </div>

          <div
            className="public-home__preview public-home__preview-enter"
            data-home-preview-reveal
            aria-label="Vista previa de la plataforma">
            <div className="public-home__preview-top">
              <div>
                <span>Curso de muestra</span>
                <strong>Resumen de la tesorería</strong>
              </div>
              <span className="public-home__preview-status">Demo</span>
            </div>
            <div className="public-home__stats">
              <article>
                <span>Fondos del curso</span>
                <AnimatedNumber value={1240000} currency />
                <small>Saldo disponible</small>
              </article>
              <article>
                <span>Cuotas registradas</span>
                <AnimatedNumber value={32} />
                <small>Apoderados al día</small>
              </article>
            </div>
            <div className="public-home__chart" aria-hidden="true">
              <div className="public-home__chart-header">
                <span>Recaudación mensual</span>
                <span>Año escolar</span>
              </div>
              <div className="public-home__bars">
                {[44, 62, 53, 78, 66, 88].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
            <div className="public-home__module-list">
              {modules.map(({ icon: Icon, label }) => (
                <span key={label}>
                  <Icon aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="public-home__features" aria-labelledby="features-title">
          <div className="public-home__section-heading" data-home-reveal>
            <span>La tesorería de un curso, en un solo lugar</span>
            <h2 id="features-title">Más claridad para apoderados y directiva</h2>
            <p>Todo lo necesario para administrar los fondos del curso con confianza.</p>
          </div>
          <div className="public-home__feature-grid">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article key={title} data-home-reveal
                style={{ "--reveal-delay": `${index * 120}ms` } as React.CSSProperties}>
                <span className="public-home__feature-icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-home__cta" data-home-reveal>
          <div>
            <h2>¿Listos para ordenar las cuentas del curso?</h2>
            <p>Creen una cuenta y comiencen a gestionar juntos la tesorería.</p>
          </div>
          <Link to="/register">
            Crear cuenta
            <FiArrowRight aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="public-home__footer" data-home-footer-reveal>
        <div className="public-home__footer-brand">
          <Link className="public-home__brand" to="/">
            <img src="/icono_tesoreria_03.png" alt="" />
            <span>Tesorería</span>
          </Link>
          <p>Finanzas claras para cada curso.</p>
        </div>

        <address className="public-home__signature" aria-label="Datos del desarrollador">
          <span className="public-home__signature-glow" aria-hidden="true" />
          <span className="public-home__signature-icon" aria-hidden="true">
            <FiCode />
          </span>
          <span className="public-home__signature-copy">
            <small>Diseñado y desarrollado por</small>
            <strong>Victor Javier Vivas</strong>
          </span>
          <span className="public-home__signature-links">
            <a href="mailto:victorjaviervivas@gmail.com">
              <FiMail aria-hidden="true" />
              <span>victorjaviervivas@gmail.com</span>
            </a>
            <a href="tel:+56986348085">
              <FiPhone aria-hidden="true" />
              <span>+56 9 8634 8085</span>
            </a>
          </span>
        </address>

        <span className="public-home__copyright">
          © {new Date().getFullYear()} Tesorería
        </span>
      </footer>
    </div>
  );
};
