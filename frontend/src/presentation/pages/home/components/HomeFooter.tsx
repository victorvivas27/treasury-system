import { Link } from "react-router-dom";
import { FiCode, FiMail, FiPhone } from "react-icons/fi";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import "../style/HomeFooter.css";

export const HomeFooter = () => (
  <footer className="public-home__footer" data-home-footer-reveal>
    <div className="public-home__footer-brand">
      <Link className="public-home__brand" to="/">
        <BrandLogo alt="" /><span>Sistema de Tesorería</span>
      </Link>
      <p>Finanzas claras para cada curso.</p>
    </div>
    <address className="public-home__signature" aria-label="Datos del desarrollador">
      <span className="public-home__signature-glow" aria-hidden="true" />
      <span className="public-home__signature-icon" aria-hidden="true"><FiCode /></span>
      <span className="public-home__signature-stage">
        <code className="public-home__signature-code" aria-hidden="true">
          <span>&lt;address&gt;</span>
          <span>&nbsp;&nbsp;&lt;small&gt;Diseñado y desarrollado por&lt;/small&gt;</span>
          <span>&nbsp;&nbsp;&lt;h2&gt;Victor Javier Vivas&lt;/h2&gt;</span>
          <span>&nbsp;&nbsp;&lt;a&gt;Contacto&lt;/a&gt;</span>
          <span>&lt;/address&gt;</span>
        </code>
        <span className="public-home__signature-rendered">
          <span className="public-home__signature-copy">
            <small>Diseñado y desarrollado por</small><strong>Victor Javier Vivas</strong>
          </span>
          <span className="public-home__signature-links">
            <a href="mailto:victorjaviervivas@gmail.com"><FiMail aria-hidden="true" />
              <span>victorjaviervivas@gmail.com</span></a>
            <a href="tel:+56986348085"><FiPhone aria-hidden="true" /><span>+56 9 8634 8085</span></a>
          </span>
        </span>
      </span>
    </address>
    <span className="public-home__copyright">© {new Date().getFullYear()} Sistema de Tesorería</span>
  </footer>
);
