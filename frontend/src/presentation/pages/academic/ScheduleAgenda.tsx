import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { FiChevronDown, FiClock, FiLogIn } from "react-icons/fi";
import { ScheduleBlockIcon } from "./ScheduleBlockIcon";
import { DAYS, TYPES, blockDurationLabel, orderedBlocks, timeLabel, type ScheduleDay } from "@/core/A-domain/entities/academic/Schedule";
import { scheduleCardColor, scheduleIngress } from "./scheduleCards";

export function ScheduleAgenda({ day, index, compact = false }: { day?: ScheduleDay; index: number; compact?: boolean }) {
  const [expanded, setExpanded] = useState(() =>
    !compact || typeof window === "undefined" || !window.matchMedia?.("(max-width: 768px)").matches);
  const [stuck, setStuck] = useState(false);
  const stickyMarker = useRef<HTMLSpanElement>(null);
  const contentId = useId();
  useEffect(() => {
    if (!compact || !stickyMarker.current || typeof IntersectionObserver === "undefined") return;
    const marker = stickyMarker.current;
    const heading = marker.nextElementSibling;
    if (!heading) return;
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      const offset = Number.parseFloat(getComputedStyle(heading).top) || 0;
      observer = new IntersectionObserver(([entry]) => setStuck(entry.boundingClientRect.top < offset),
        { rootMargin: `-${offset}px 0px 0px 0px`, threshold: 0 });
      observer.observe(marker);
    };
    observe();
    window.addEventListener("resize", observe);
    return () => { observer.disconnect(); window.removeEventListener("resize", observe); };
  }, [compact]);
  const blocks = day ? orderedBlocks(day) : [];
  const ingress = day ? scheduleIngress(day) : null;
  return <article className={`schedule-agenda${compact ? " schedule-agenda--compact" : " schedule-agenda--day"}`} aria-label={`Jornada · ${DAYS[index]}`}>
    {compact && <span ref={stickyMarker} className="schedule-agenda-sticky-marker" aria-hidden="true" />}
    {compact ? <div className={`schedule-agenda-heading schedule-agenda-toggle-heading${stuck ? " is-stuck" : ""}`}>
      <h2><button type="button" className="schedule-agenda-toggle" aria-label={DAYS[index]} aria-expanded={expanded} aria-controls={contentId}
        onClick={() => setExpanded(value => !value)}>
        <span className="schedule-agenda-day-title"><span>{DAYS[index]}</span><FiChevronDown aria-hidden="true" /></span>
        {day ? <span className="schedule-agenda-day-times">
          <span>Entrada <strong>{timeLabel(day.entryTime)}</strong></span>
          <span>Salida <strong>{timeLabel(day.exitTime)}</strong></span>
        </span> : <span className="schedule-agenda-day-empty">Sin jornada publicada</span>}
      </button></h2>
    </div> : <div className="schedule-agenda-heading">
      <div><h2>{DAYS[index]}</h2>
        <p>{day ? `Entrada ${timeLabel(day.entryTime)} · ${blocks.length} bloques programados` : "Sin jornada publicada"}</p></div>
      {day && <div className="schedule-agenda-exit"><FiClock aria-hidden="true" /><span>Salida<strong>{timeLabel(day.exitTime)}</strong></span></div>}
    </div>}
    <div id={contentId} className={`schedule-agenda-content${!compact || expanded ? " is-expanded" : ""}`} inert={compact && !expanded}>
    <div className="schedule-agenda-content-inner">
    {day && <ol className="schedule-agenda-list" aria-label={`Bloques · ${DAYS[index]}`}>
      {ingress && <li className="schedule-agenda-card schedule-agenda-ingress">
        <span className="schedule-agenda-time"><time>{ingress.start}</time><time>{ingress.end}</time></span>
        <FiLogIn aria-hidden="true" /><div className="schedule-agenda-subject"><strong>Ingreso</strong>{!compact && <small>Inicio de la jornada</small>}</div>
      </li>}
      {blocks.map((block, position) => {
        const named = block.type === "SUBJECT" || block.type === "ACTIVITY" || block.type === "EVENT";
        const title = named ? block.name?.trim() || TYPES[block.type] : TYPES[block.type];
        return <li key={position} className={`schedule-agenda-card${!named ? " schedule-agenda-card--pause" : ""}`} style={{ "--agenda-color": scheduleCardColor(block) } as CSSProperties}>
          <span className="schedule-agenda-time"><time>{timeLabel(block.startTime)}</time><time>{timeLabel(block.endTime)}</time></span>
          <ScheduleBlockIcon block={block} /><div className="schedule-agenda-subject"><strong>{title}</strong>{named && !compact && <small>{TYPES[block.type]}</small>}</div>
          {blockDurationLabel(block) && <span className="schedule-agenda-duration">{blockDurationLabel(block)}</span>}
        </li>;
      })}
    </ol>}
    {day && !blocks.length && <p className="schedule-agenda-empty">Sin bloques programados.</p>}
    </div>
    </div>
  </article>;
}
