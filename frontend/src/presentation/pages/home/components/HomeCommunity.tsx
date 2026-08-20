import { useEffect, useState, type CSSProperties } from "react";
import { FiAward, FiBookOpen, FiCamera, FiCompass, FiGift, FiHeart, FiMail, FiMusic,
  FiSmile, FiStar, FiSun, FiTarget, FiUsers } from "react-icons/fi";
import type { AboutIcon, AboutSection } from "@/core/A-domain/entities/community/AboutSection";
import { AboutSectionUseCases } from "@/core/B-application/use-cases/community/AboutSectionUseCases";
import { AboutSectionRepositoryImpl } from "@/core/C-infra/repositories/community/AboutSectionRepositoryImpl";
import "../style/HomeCommunity.css";

const boardRoles = ["Presidencia", "Tesorería", "Secretaría"];
const about = new AboutSectionUseCases(new AboutSectionRepositoryImpl());
const icons: Record<AboutIcon, typeof FiUsers> = {
  USERS: FiUsers, HEART: FiHeart, STAR: FiStar, BOOK: FiBookOpen,
  TARGET: FiTarget, SMILE: FiSmile,
  AWARD: FiAward, COMPASS: FiCompass, GIFT: FiGift, MUSIC: FiMusic, SUN: FiSun,
};

export const HomeCommunity = () => {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [expandedCard, setExpandedCard] = useState<number>();
  useEffect(() => { about.publicList().then(setSections).catch(() => setSections([])); }, []);
  return (
  <div className="home-community">
    <section id="sobre-nosotros" className="home-community__about" data-home-reveal>
      <header><span className="home-community__eyebrow">Sobre nosotros</span>
        <h2>Conoce el corazón de nuestro curso</h2>
        <p>Cada historia, valor y meta que compartimos construye nuestra comunidad.</p></header>
      <div className="home-community__about-grid">
        <span className="home-community__eyebrow">Sobre nosotros</span>
        {sections.length === 0 ? <article className="home-community__about-card is-turquoise is-featured">
          <span className="home-community__card-icon"><FiUsers /></span><div><h2>Una comunidad organizada y conectada</h2>
          <p>Este espacio reúne la información del curso y facilita una comunicación clara entre
            las familias y su directiva.</p></div></article> : sections.map((section, index) => {
          const Icon = icons[section.icon] ?? FiUsers;
          return <article key={section.id} style={{ "--card-delay": `${index * 90}ms` } as CSSProperties}
            className={`home-community__about-card is-${section.accentColor.toLowerCase()} ${section.featured ? "is-featured" : ""}`}>
            <span className="home-community__card-icon"><Icon aria-hidden="true" /></span>
            <div><h3>{section.title}</h3>
              <p className={expandedCard === section.id ? "is-expanded" : ""}>
                {section.description}</p>
              {section.description.length > 120 && <button className="home-community__read-more"
                type="button" onClick={() => setExpandedCard(current =>
                  current === section.id ? undefined : section.id)}>
                {expandedCard === section.id ? "Ver menos" : "Leer más"}
              </button>}
              {section.highlightedPhrase && <blockquote>“{section.highlightedPhrase}”</blockquote>}</div>
          </article>;
        })}
      </div>
    </section>

    <section id="fotos-del-curso" className="home-community__content" data-home-reveal>
      <div className="home-community__heading">
        <span className="home-community__eyebrow">Fotos del curso</span>
        <h2>Nuestros momentos</h2>
        <p>Próximamente la directiva podrá compartir aquí las actividades y recuerdos del curso.</p>
      </div>
      <div className="home-community__photo-placeholder" role="img"
        aria-label="Galería de fotos del curso pendiente de publicación">
        <FiCamera aria-hidden="true" /><span>Galería del curso</span>
      </div>
    </section>

    <section id="directiva" className="home-community__content" data-home-reveal>
      <div className="home-community__heading">
        <span className="home-community__eyebrow">Directiva</span>
        <h2>Representantes del curso</h2>
      </div>
      <div className="home-community__board">
        {boardRoles.map((role) => <article key={role}>
          <span aria-hidden="true">{role.charAt(0)}</span><h3>{role}</h3>
          <p>Información por publicar</p>
        </article>)}
      </div>
    </section>

    <section id="contacto" className="home-community__contact" data-home-reveal>
      <FiMail aria-hidden="true" />
      <div><span className="home-community__eyebrow">Contacto</span>
        <h2>Comunícate con la directiva</h2>
        <p>Los datos de contacto del curso estarán disponibles cuando la directiva los publique.</p>
      </div>
    </section>
  </div>
  );
};
