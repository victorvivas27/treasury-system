import type { CSSProperties } from "react";
import { FiBarChart2, FiDollarSign, FiUsers } from "react-icons/fi";
import "../style/HomeFeatures.css";

const features = [
  { icon: FiDollarSign, title: "Cuotas al día",
    description: "Registra las cuotas del curso y mantén un seguimiento claro de los pagos." },
  { icon: FiUsers, title: "Apoderados informados",
    description: "Comparte información financiera clara con las familias del curso." },
  { icon: FiBarChart2, title: "Rendición transparente",
    description: "Entrega a la directiva resúmenes de ingresos, gastos y actividades." },
];

export const HomeFeatures = () => (
  <section className="public-home__features" aria-labelledby="features-title">
    <div className="public-home__section-heading" data-home-reveal data-home-scroll-repeat>
      <span>La tesorería de un curso, en un solo lugar</span>
      <h2 id="features-title">Más claridad para apoderados y directiva</h2>
      <p>Todo lo necesario para administrar los fondos del curso con confianza.</p>
    </div>
    <div className="public-home__feature-grid">
      {features.map(({ icon: Icon, title, description }, index) => (
        <article key={title} data-home-reveal data-home-card
          style={{ "--reveal-delay": `calc(${index} * var(--stagger-features))` } as CSSProperties}>
          <span className="public-home__feature-icon"><Icon aria-hidden="true" /></span>
          <h3>{title}</h3>
          <p>{description}</p>
        </article>
      ))}
    </div>
  </section>
);
