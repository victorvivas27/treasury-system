import { useEffect, useState } from 'react';
import { publicImages } from '@/shared/assets/publicImages';
import { lockBodyScroll } from '@/shared/ui/dialog/scrollLock';
import '../style/HomeEntryTransition.css';

export function HomeEntryTransition({ ready, onExited, pageEntry = false }: { ready: boolean; onExited: () => void; pageEntry?: boolean }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => lockBodyScroll(), []);
  useEffect(() => {
    if (!ready) return;
    // Let the populated home commit and paint beneath the overlay before revealing it.
    let timer: number | undefined;
    const frame = requestAnimationFrame(() => {
      setLeaving(true);
      timer = window.setTimeout(onExited, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
    });
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [ready, onExited]);

  return <div className={`home-entry-transition${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
    <picture className="home-entry-transition__art" aria-hidden="true">
      <source media="(max-width: 600px)" srcSet={publicImages.loginMobile} />
      <img src={publicImages.loginDesktop} alt="" />
    </picture>
    <div className="home-entry-transition__shade" aria-hidden="true" />
    <header><span>Tesorería Escolar</span><span>Tu comunidad. Tus proyectos.</span></header>
    <div className="home-entry-transition__copy">
      <p>{pageEntry ? 'Todo tu curso, conectado' : 'Tu comunidad te espera'}</p>
      <h1><span>{pageEntry ? 'Cada detalle' : 'Ya estás'}</span><em>{pageEntry ? 'cuenta.' : 'en casa.'}</em></h1>
      <p>{pageEntry ? 'Preparando la información de tu curso.' : 'Preparando el espacio de tu curso.'}</p>
    </div>
    <footer>
      <div className="home-entry-transition__icons" aria-hidden="true">
        {[publicImages.communityCare, publicImages.communityFamilies, publicImages.communityGoals].map((src, index) =>
          <img key={src} src={src} alt="" style={{ animationDelay: `${index * 180}ms` }} />)}
      </div>
      <span className="home-entry-transition__status">{ready ? 'Todo listo.' : pageEntry ? 'Preparando tu espacio…' : 'Preparando tu inicio…'}</span>
    </footer>
  </div>;
}
