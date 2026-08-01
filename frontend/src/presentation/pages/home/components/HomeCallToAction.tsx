import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import "../style/HomeCallToAction.css";

export const HomeCallToAction = () => (
  <section className="public-home__cta" data-home-reveal>
    <div>
      <h2>¿Listo para ordenar las cuentas del curso?</h2>
      <p>Crea una cuenta y comienza a gestionar la tesorería junto a tu curso.</p>
    </div>
    <Link to="/register">Crear cuenta <FiArrowRight aria-hidden="true" /></Link>
  </section>
);
