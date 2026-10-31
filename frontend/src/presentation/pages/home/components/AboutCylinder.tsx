import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { communityImage } from '@/shared/ui/community-icons/communityImages';
import type { AboutSection } from '@/core/A-domain/entities/community/AboutSection';
import { createPortal } from 'react-dom';
import { useDialogAnchor, useDialogFocus } from '@/shared/ui/dialog/useDialogFocus';
import '../style/AboutCylinder.css';
import '../style/AboutCylinderDesktop.css';

type Card = Pick<AboutSection, 'id' | 'title' | 'description' | 'icon' | 'accentColor' | 'highlightedPhrase' | 'featured'>;
const fallback: Card = { id: 0, title: 'Una comunidad organizada y conectada', description: 'Este espacio reúne la información del curso y facilita una comunicación clara entre las familias y su directiva.', icon: 'USERS', accentColor: 'TURQUOISE', highlightedPhrase: null, featured: true };
const modulo = (value: number, count: number) => ((value % count) + count) % count;

export function AboutCylinder({ sections }: { sections: Card[] }) {
  const cards = sections.length ? sections : [fallback];
  const count = cards.length;
  const id = useId();
  const [position, setPosition] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [anchor, setAnchor] = useState({ top: 12, left: 12 });
  const dialog = useDialogFocus(expanded !== null, () => setExpanded(null));
  useDialogAnchor(dialog, expanded !== null, anchor);
  const expandedCard = cards.find(card => card.id === expanded);
  const [dragging, setDragging] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [parallax, setParallax] = useState(0);
  const current = useRef(0);
  const frame = useRef<number | undefined>(undefined);
  const stage = useRef<HTMLDivElement>(null);
  const wheelTimer = useRef<number | undefined>(undefined);
  const suppressClick = useRef(false);
  const pointer = useRef<{ id: number; x: number; y: number; lastX: number; time: number; velocity: number; start: number; horizontal: boolean } | null>(null);
  const activeIndex = modulo(Math.round(position), count);
  const activeCard = cards[activeIndex];
  const update = (value: number) => { current.current = value; setPosition(value); };
  const stop = () => { if (frame.current !== undefined) cancelAnimationFrame(frame.current); };
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query?.matches ?? false);
    query?.addEventListener('change', change);
    return () => { query?.removeEventListener('change', change); stop(); };
  }, []);
  useEffect(() => { if (reduced) { stop(); update(Math.round(current.current)); setParallax(0); } }, [reduced]);
  useEffect(() => { stop(); update(0); setExpanded(null); }, [count]);

  const settle = (target: number) => {
    stop(); setExpanded(null); setParallax(0);
    if (reduced || count < 2) { update(target); return; }
    const start = current.current;
    const duration = Math.min(580, 300 + Math.abs(target - start) * 90);
    let started: number | undefined;
    const animate = (time: number) => {
      started ??= time;
      const progress = Math.min(1, (time - started) / duration);
      update(start + (target - start) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
  };
  useEffect(() => {
    const element = stage.current;
    if (!element || count < 2) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || (event.target as HTMLElement).closest('.about-cylinder__body.is-expanded')) return;
      const delta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
      if (!delta) return;
      event.preventDefault();
      stop(); window.clearTimeout(wheelTimer.current);
      const pixels = delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
      setExpanded(null); update(current.current + pixels / 245);
      wheelTimer.current = window.setTimeout(() => settle(Math.round(current.current)), 160);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => { element.removeEventListener('wheel', wheel); window.clearTimeout(wheelTimer.current); };
  }, [count, reduced]);
  const move = (direction: number) => settle(Math.round(current.current) + direction);
  const select = (index: number) => {
    const offset = modulo(index - current.current + count / 2, count) - count / 2;
    settle(current.current + offset);
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (count < 2 || !event.isPrimary || event.pointerType === 'mouse'
      || (event.target as HTMLElement).closest('button, .about-cylinder__body.is-expanded')) return;
    stop(); suppressClick.current = false;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, time: event.timeStamp, velocity: 0, start: current.current, horizontal: false };
  };
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    const state = pointer.current;
    if (!state) return;
    if (state.id !== event.pointerId) return;
    if (event.pointerType === 'mouse' && (event.buttons & 1) === 0) {
      pointer.current = null; setDragging(false);
      if (state.horizontal) settle(Math.round(current.current));
      return;
    }
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      if (Math.abs(dy) > Math.abs(dx)) { pointer.current = null; return; }
      state.horizontal = true; setDragging(true); setExpanded(null);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - state.time);
    state.velocity = .65 * state.velocity + .35 * (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX; state.time = event.timeStamp;
    suppressClick.current = true;
    update(state.start - dx / 245);
    if (!reduced) setParallax(Math.max(-3, Math.min(3, dx * .015)));
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const state = pointer.current;
    if (!state || state.id !== event.pointerId) return;
    pointer.current = null; setDragging(false);
    if (state.horizontal) {
      const velocity = event.timeStamp - state.time > 100 || cancelled || reduced ? 0 : state.velocity;
      const momentum = Math.max(-.35, Math.min(.35, -velocity * 140 * .6 / 245));
      const origin = Math.round(state.start);
      const travel = Math.abs(state.lastX - state.x);
      const target = travel < 45 || cancelled ? origin
        : origin + Math.max(-1, Math.min(1, Math.round(current.current + momentum) - origin));
      settle(target);
    }
  };

  return <div className="about-cylinder" role="region" aria-roledescription="carrusel" aria-label="Lo que nos mueve"
    onKeyDown={event => {
      if ((event.target as HTMLElement).closest('.about-cylinder__body.is-expanded')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      else if (event.key === 'Home') { event.preventDefault(); select(0); }
      else if (event.key === 'End') { event.preventDefault(); select(count - 1); }
    }}>
    <div ref={stage} className={`about-cylinder__stage${dragging ? ' is-dragging' : ''}`} tabIndex={count > 1 ? 0 : -1}
      aria-label="Desliza o usa las flechas para recorrer los mensajes"
      onPointerDown={startDrag} onPointerMove={drag}
      onPointerLeave={() => {
        if (pointer.current && !pointer.current.horizontal) pointer.current = null;
        if (!pointer.current && Math.abs(current.current - Math.round(current.current)) > .001) settle(Math.round(current.current));
      }}
      onPointerUp={event => endDrag(event)} onPointerCancel={event => endDrag(event, true)}
      onLostPointerCapture={event => { if (event.target === event.currentTarget) endDrag(event, true); }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
      <div className="about-cylinder__ring" style={{ '--drag-tilt': `${parallax}deg` } as CSSProperties}>
        {cards.map((card, index) => {
          const offset = modulo(index - position + count / 2, count) - count / 2;
          const angle = offset * 55 * Math.PI / 180;
          const distance = Math.abs(offset);
          const active = index === activeIndex;
          const visible = distance <= 2.25;
          const words = card.description.trim().split(/\s+/).filter(Boolean);
          const preview = words.slice(0, 20).join(' ') + (words.length > 20 ? '…' : '');
          return <article key={card.id} role="group" aria-roledescription="diapositiva"
            aria-label={`${index + 1} de ${count}: ${card.title}`} aria-hidden={!active}
            className={`about-cylinder__card is-${card.accentColor.toLowerCase()}${active ? ' is-current' : ''}${card.featured ? ' is-featured' : ''}`}
            style={{ '--card-x': Math.sin(angle), '--card-z': Math.cos(angle) - 1, '--card-yaw': `${Math.max(-68, Math.min(68, -offset * 45))}deg`, '--card-fade': visible ? Math.max(.12, 1 - distance * .55) : 0, zIndex: 100 - Math.round(distance * 10), visibility: visible ? 'visible' : 'hidden' } as CSSProperties}
            onClick={() => { if (!active && !suppressClick.current) select(index); }}>
            <img className="about-cylinder__watermark" src={communityImage(card.icon)} alt="" aria-hidden="true" draggable={false} />
            <div className="about-cylinder__card-header">
              <h3>{card.title}</h3>
            </div>
            <div className="about-cylinder__body" id={`${id}-message-${card.id}`} inert={!active}>
              <p>{preview}</p>
              {card.highlightedPhrase && <blockquote>“{card.highlightedPhrase}”</blockquote>}
            </div>
            <button type="button" className="about-cylinder__read-more"
              tabIndex={active ? 0 : -1} aria-haspopup="dialog"
              onClick={event => {
                stop();
                const rect = event.currentTarget.closest('article')!.getBoundingClientRect();
                setAnchor({ top: rect.top, left: rect.left });
                setExpanded(card.id);
              }}>Leer más</button>
          </article>;
        })}
      </div>
    </div>
    <p className="about-cylinder__announcement" role="status" aria-live={dragging ? 'off' : 'polite'} aria-atomic="true">{activeIndex + 1} / {count} · {activeCard.title}</p>
    {expandedCard && createPortal(<aside ref={dialog} className="home-community about-message-overlay" role="dialog" aria-modal="true"
      aria-labelledby={`${id}-dialog-title`} tabIndex={-1} onClick={() => setExpanded(null)}>
      <article className={`about-message-panel is-${expandedCard.accentColor.toLowerCase()}`} style={{ left: anchor.left, top: anchor.top }} onClick={event => event.stopPropagation()}>
        <img className="about-message__watermark" src={communityImage(expandedCard.icon)} alt="" aria-hidden="true" draggable={false} />
        <header><h3 id={`${id}-dialog-title`}>{expandedCard.title}</h3><button type="button" aria-label="Cerrar mensaje" onClick={() => setExpanded(null)}>×</button></header>
        <div className="about-message-content" tabIndex={0}><p>{expandedCard.description}</p>
          {expandedCard.highlightedPhrase && <blockquote>“{expandedCard.highlightedPhrase}”</blockquote>}
        </div>
      </article>
    </aside>, document.body)}
  </div>;
}
