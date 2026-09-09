import { useEffect, useState } from "react";
import { FiDownload, FiMoreVertical, FiShare2 } from "react-icons/fi";
import "../style/HomeInstallGuide.css";

const installTitle = "¡Instala Tesorería Escolar en tu celular!";

export const HomeInstallGuide = () => {
  const [visibleTitle, setVisibleTitle] = useState("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleTitle(installTitle);
      return undefined;
    }

    let character = 0;
    let timer = 0;

    const animateTitle = () => {
      character += 1;
      setVisibleTitle(installTitle.slice(0, character));

      if (character >= installTitle.length) {
        return;
      }

      timer = window.setTimeout(animateTitle, 70);
    };

    timer = window.setTimeout(animateTitle, 350);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="public-home__install" data-home-reveal data-home-scroll-repeat
      aria-labelledby="install-app-title">
    <div className="public-home__install-heading">
      <span className="public-home__install-icon">
        <img src="/icono-tesoreria.png" alt="Icono de Tesorería Escolar" />
      </span>
      <div>
        <span className="public-home__install-eyebrow"><FiDownload aria-hidden="true" /> Aplicación instalable</span>
        <h2 id="install-app-title" aria-label={installTitle}>
          <span aria-hidden="true">{visibleTitle}</span><span className="public-home__typing-caret" aria-hidden="true" />
        </h2>
        <p>Es muy fácil: agrégala a tu pantalla de inicio y ábrela como cualquier otra aplicación.</p>
      </div>
    </div>

    <div className="public-home__install-options">
      <article>
        <FiMoreVertical aria-hidden="true" />
        <div>
          <h3>Android con Chrome</h3>
          <p>Abre el menú <strong>⋮</strong> y selecciona <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</p>
        </div>
      </article>
      <article>
        <FiShare2 aria-hidden="true" />
        <div>
          <h3>iPhone con Safari</h3>
          <p>Presiona <strong>Compartir</strong> y luego selecciona <strong>Agregar a inicio</strong>.</p>
        </div>
      </article>
    </div>
    </section>
  );
};
