import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiFileText,
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

export const HomePage = () => {
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
          <div className="public-home__hero-copy">
            <span className="public-home__eyebrow">
              <FiShield aria-hidden="true" />
              Gestión simple y segura
            </span>
            <h1>Las finanzas de tu curso, claras y ordenadas</h1>
            <p>
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

          <div className="public-home__preview" aria-label="Vista previa de la plataforma">
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
                <strong>$ 1.240.000</strong>
                <small>Saldo disponible</small>
              </article>
              <article>
                <span>Cuotas registradas</span>
                <strong>32</strong>
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
          <div className="public-home__section-heading">
            <span>La tesorería de un curso, en un solo lugar</span>
            <h2 id="features-title">Más claridad para apoderados y directiva</h2>
            <p>Todo lo necesario para administrar los fondos del curso con confianza.</p>
          </div>
          <div className="public-home__feature-grid">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title}>
                <span className="public-home__feature-icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-home__cta">
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

      <footer className="public-home__footer">
        <Link className="public-home__brand" to="/">
          <img src="/icono_tesoreria_03.png" alt="" />
          <span>Tesorería</span>
        </Link>
        <p>Finanzas claras para cada curso.</p>
        <span>© {new Date().getFullYear()} Tesorería</span>
      </footer>
    </div>
  );
};
