import { useEffect, useState } from 'react';
import { publicImages } from '@/shared/assets/publicImages';
import { lockBodyScroll } from '@/shared/ui/dialog/scrollLock';
import '../style/HomeEntryTransition.css';

export function HomeEntryTransition({ ready, onExited, pageEntry = false, minimumDurationMs = 0 }: { ready: boolean; onExited: () => void; pageEntry?: boolean; minimumDurationMs?: number }) {
  const [leaving, setLeaving] = useState(false);
  const [startedAt] = useState(() => Date.now());
  useEffect(() => lockBodyScroll(), []);
  useEffect(() => {
    if (!ready) return;
    // Let the populated home commit and paint beneath the overlay before revealing it.
    let timer: number | undefined;
    let frame: number | undefined;
    const wait = window.setTimeout(() => {
      frame = requestAnimationFrame(() => {
        setLeaving(true);
        timer = window.setTimeout(onExited, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
      });
    }, Math.max(0, minimumDurationMs - (Date.now() - startedAt)));
    return () => { window.clearTimeout(wait); if (frame !== undefined) cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [ready, onExited, minimumDurationMs, startedAt]);

  return <div className={`home-entry-transition${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
    <picture className="home-entry-transition__art" aria-hidden="true">
      <source media="(max-width: 600px)" srcSet={publicImages.loginMobile} />
      <img src={publicImages.loginDesktop} alt="" />
    </picture>
    <div className="home-entry-transition__shade" aria-hidden="true" />
    <header><span>Tesorería Escolar</span><span>Tu comunidad. Tus proyectos.</span></header>
    <div className="home-entry-transition__copy">
      <p>{pageEntry ? 'Todo tu curso, conectado' : 'Tesorería de tu curso'}</p>
      <h1><span>{pageEntry ? 'Cada detalle' : 'Estás por'}</span><em>{pageEntry ? 'cuenta.' : 'ingresar.'}</em></h1>
      <p>{pageEntry ? 'Preparando la información de tu curso.' : 'Preparando el acceso a tu panel.'}</p>
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
