import { useEffect, useRef, useState, type ReactNode } from "react";
import { FcExpand } from "react-icons/fc";
import { DAYS, timeLabel, type ScheduleDay } from "@/core/A-domain/entities/academic/Schedule";

export function ScheduleDayPanel({ index, day, children }: { index: number; day?: ScheduleDay; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [stuck, setStuck] = useState(false);
  const panel = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const article = panel.current;
    if (!article) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const target = expanded ? article.querySelector<HTMLElement>(".schedule-day-sticky-heading") : article;
      if (!target) return;
      const style = getComputedStyle(target);
      const top = Number.parseFloat(style.top);
      setStuck(style.position === "sticky" && Number.isFinite(top) && target.getBoundingClientRect().top <= top + 1);
    };
    const scheduleUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true, capture: true });
    window.addEventListener("resize", scheduleUpdate);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);
    observer?.observe(article);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [expanded]);
  const name = DAYS[index];
  const id = `schedule-day-content-${index + 1}`;
  return <article ref={panel} className={`schedule-day schedule-day-panel ${expanded ? "is-expanded" : "is-collapsed"}${stuck ? " is-stuck" : ""}`}>
    <div className="schedule-day-sticky-heading"><h2 className={`schedule-day-heading schedule-day-heading--${index + 1}`} aria-label={name}>
      <button type="button" className="schedule-day-toggle" aria-label={`${expanded ? "Plegar" : "Desplegar"} ${name}`}
        aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
        <span>{name}</span><FcExpand aria-hidden="true" />
      </button>
    </h2></div>
    <p className="schedule-day-overview">{day ? `${timeLabel(day.entryTime) || "--:--"} – ${timeLabel(day.exitTime) || "--:--"} · ${day.blocks.length} bloques` : "Sin configurar"}</p>
    <div className="schedule-day-collapse" id={id} inert={!expanded} aria-hidden={!expanded}>
      <div className="schedule-day-collapse-inner">{children}</div>
    </div>
  </article>;
}
