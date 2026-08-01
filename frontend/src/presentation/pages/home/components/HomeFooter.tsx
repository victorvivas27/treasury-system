import { Link } from "react-router-dom";
import { FiCode, FiMail, FiPhone } from "react-icons/fi";
import "../style/HomeFooter.css";

export const HomeFooter = () => (
  <footer className="public-home__footer" data-home-footer-reveal>
    <div className="public-home__footer-brand">
      <Link className="public-home__brand" to="/">
        <img src="/Tesoreria.png" alt="" /><span>Sistema de Tesorería</span>
      </Link>
      <p>Finanzas claras para cada curso.</p>
    </div>
    <address className="public-home__signature" aria-label="Datos del desarrollador">
      <span className="public-home__signature-glow" aria-hidden="true" />
      <span className="public-home__signature-icon" aria-hidden="true"><FiCode /></span>
      <span className="public-home__signature-copy">
        <small>Diseñado y desarrollado por</small><strong>Victor Javier Vivas</strong>
      </span>
      <span className="public-home__signature-links">
        <a href="mailto:victorjaviervivas@gmail.com"><FiMail aria-hidden="true" />
          <span>victorjaviervivas@gmail.com</span></a>
        <a href="tel:+56986348085"><FiPhone aria-hidden="true" /><span>+56 9 8634 8085</span></a>
      </span>
    </address>
    <span className="public-home__copyright">© {new Date().getFullYear()} Sistema de Tesorería</span>
  </footer>
);
