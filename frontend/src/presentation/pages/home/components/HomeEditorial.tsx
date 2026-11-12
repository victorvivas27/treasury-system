import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowDown, FiArrowUpRight, FiCheck, FiUpload, FiEye, FiUsers } from 'react-icons/fi';
import { HomeInstallGuide } from './HomeInstallGuide';
import '../style/HomeEditorial.css';
import '../style/HomeEditorialMobile.css';

const chapters = [
  { title: 'Sabes qué corresponde pagar.', label: 'Consulta tus cuotas', status: 'Pendiente', Icon: FiEye,
    text: 'En Mis pagos, cada apoderado consulta sus cuotas, vencimientos y estado de pago. Los datos bancarios del curso están disponibles para realizar la transferencia.' },
  { title: 'Tu comprobante tiene su lugar.', label: 'Envía el comprobante', status: 'Comprobante enviado', Icon: FiUpload,
    text: 'Después de transferir, adjunta el comprobante desde tu cuenta. El pago queda enviado para revisión; subir el archivo no significa que ya esté aprobado.' },
  { title: 'La directiva revisa. El estado cambia.', label: 'Revisión de la directiva', status: 'Pagado', Icon: FiCheck,
    text: 'La directiva revisa el comprobante y aprueba o rechaza el pago. Cada familia puede consultar el estado de sus cuotas desde su espacio.' },
];

export function HomeEditorial() {
  const root = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scenes = [...node.querySelectorAll<HTMLElement>('[data-editorial-scene]')];
    const steps = [...node.querySelectorAll<HTMLElement>('[data-editorial-step]')];
    const storyVisual = node.querySelector<HTMLElement>('.he-story__visual');
    let bootFrame = 0;
    const revealHero = () => {
      if (document.getElementById('app-boot-loader')) return;
      bootObserver.disconnect();
      bootFrame = requestAnimationFrame(() => node.classList.add('is-ready'));
    };
    const bootObserver = new MutationObserver(revealHero);
    bootObserver.observe(document.body, { childList: true });
    revealHero();
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = window.innerHeight;
      for (const scene of scenes) {
        const rect = scene.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (height - rect.top) / (height + rect.height)));
        const entering = Math.max(0, Math.min(1, (height * .96 - rect.top) / (height * .42)));
        const leaving = Math.max(0, Math.min(1, (rect.bottom - height * .06) / (height * .35)));
        const reveal = Math.min(entering, leaving);
        scene.style.setProperty('--reveal', String(media.matches ? 1 : reveal));
        scene.style.setProperty('--travel', `${media.matches ? 0 : (progress - .5) * 24}px`);
      }
      // Activate a chapter when its beginning reaches the readable area.
      // The same boundaries apply in both scroll directions; the sticky mobile
      // heading is excluded so it cannot advance the step before its text.
      const pinnedBottom = window.innerWidth < 700 && !media.matches
        ? Math.max(0, Math.min(height, storyVisual?.getBoundingClientRect().bottom ?? 0))
        : 0;
      const readingLine = pinnedBottom + (height - pinnedBottom) * .4;
      let activeChapter = 0;
      steps.forEach((step, index) => {
        if (step.getBoundingClientRect().top <= readingLine) activeChapter = index;
      });
      setChapter(current => current === activeChapter ? current : activeChapter);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    media.addEventListener('change', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      media.removeEventListener('change', schedule);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(bootFrame);
      bootObserver.disconnect();
      node.classList.remove('is-ready');
    };
  }, []);
  const ActiveIcon = chapters[chapter].Icon;
  return <div className="home-editorial" ref={root}>
    <section className="he-hero" data-editorial-scene aria-labelledby="he-title">
      <picture className="he-hero__art">
        <source media="(max-width: 699px)" srcSet="/images/home/home_movil_01.png" />
        <img className="he-photo" src="/images/home/home_01.png" alt="" fetchPriority="high" width="1536" height="1024" />
      </picture>
      <div className="he-hero__copy he-gutter">
        <p className="he-kicker">Tesorería Escolar / Tu comunidad, conectada</p>
        <h1 id="he-title"><span>Lo que <br />hacemos </span><em>juntos.</em></h1>
        <p className="he-hero__description">Las cuotas, las actividades y la vida de tu curso. Un espacio para organizar lo que construyen entre todos.</p>
        <Link className="he-link he-link--light" to="/login">Entrar a mi curso <FiArrowUpRight aria-hidden="true" /></Link>
      </div>
      <a className="he-hero__scroll he-gutter" href="#casos-reales"><span>Conoce la app desde dentro</span><FiArrowDown aria-hidden="true" /></a>
    </section>

    <section className="he-intro he-gutter" id="casos-reales" data-editorial-scene aria-labelledby="he-intro-title">
      <p className="he-kicker he-reveal">01 / Del aporte a la cuenta clara</p>
      <h2 className="he-reveal" id="he-intro-title">Menos mensajes <br />sueltos. <br /><em>Más claridad.</em></h2>
      <div className="he-intro__aside he-reveal"><p>Una cuota no termina en una transferencia. También hay que enviar el comprobante, revisarlo y saber en qué quedó.</p><p>Así funciona ese recorrido en Tesorería Escolar.</p><a className="he-text-link" href="#recorrido">Sigue el recorrido <FiArrowDown aria-hidden="true" /></a></div>
    </section>

    <section className="he-story" id="recorrido" data-editorial-scene aria-label="Cómo funciona el pago por transferencia">
      <div className="he-story__visual" data-editorial-scene>
        <div className="he-story__overlay he-gutter">
          <span className="he-kicker">El recorrido de una transferencia</span>
          <div className="he-story__status" aria-hidden="true"><span>0{chapter + 1} / 03</span><ActiveIcon /><strong>{chapters[chapter].status}</strong></div>
          <nav className="he-story__nav" aria-label="Pasos de una transferencia">{chapters.map((item, index) => <a key={item.label} href={`#paso-${index + 1}`} aria-current={chapter === index ? 'step' : undefined}><span>0{index + 1}</span><span className="he-sr-only">{item.label}</span></a>)}</nav>
          <small>Flujo explicativo · No registra pagos</small>
        </div>
      </div>
      <div className="he-story__chapters">{chapters.map(({ title, label, text }, index) => <article className="he-chapter he-gutter" data-editorial-step data-editorial-scene id={`paso-${index + 1}`} key={label}>
        <div className="he-reveal"><p className="he-kicker">0{index + 1} / {label}</p><h2>{title}</h2><p>{text}</p></div>
      </article>)}</div>
    </section>

    <section className="he-possibilities he-gutter" data-editorial-scene aria-labelledby="he-more-title">
      <p className="he-kicker he-reveal">02 / Mucho más que una cuota</p>
      <h2 className="he-reveal" id="he-more-title">El curso también <br />se vive <em>acá.</em></h2>
      <div className="he-index">
        <article data-editorial-scene className="he-reveal"><span>01</span><div><h3>Familias, con contexto.</h3><p>La directiva organiza alumnos, apoderados y sus vínculos familiares para identificar a quién corresponde cada aporte.</p></div></article>
        <article data-editorial-scene className="he-reveal"><span>02</span><div><h3>Actividades que suman.</h3><p>Eventos, productos y ventas de stands. La gestión acompaña la actividad desde su preparación hasta el cierre y la revisión de su resultado.</p></div></article>
        <article data-editorial-scene className="he-reveal"><span>03</span><div><h3>Las cuentas, a la vista.</h3><p>La directiva registra ingresos y egresos, consulta el resumen financiero y prepara reportes del curso.</p></div></article>
        <article data-editorial-scene className="he-reveal"><span>04</span><div><h3>Un lugar para encontrarse.</h3><p>Al entrar, encuentra el horario de clases, la directiva y las fotografías compartidas de tu comunidad.</p></div></article>
      </div>
    </section>

    <section className="he-access" data-editorial-scene aria-labelledby="he-access-title">
      <div className="he-access__copy he-gutter he-reveal"><p className="he-kicker">03 / Cada persona, su espacio</p><FiUsers aria-hidden="true" /><h2 id="he-access-title">Tu curso.<br /><em>Tu lugar.</em></h2><p>Como apoderado, consulta tus pagos y participa de la comunidad. Como directiva, organiza las familias, los fondos y las actividades.</p><Link className="he-link" to="/login">Iniciar sesión <FiArrowUpRight aria-hidden="true" /></Link><p className="he-access__invitation">¿Aún no tienes acceso? Consulta a la administración de tu curso para recibir tu invitación.</p><HomeInstallGuide placement="menu" /></div>
    </section>
  </div>;
}
