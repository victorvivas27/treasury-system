import { useState, type ReactNode } from "react";
import { FcExpand } from "react-icons/fc";
import { DAYS, timeLabel, type ScheduleDay } from "@/core/A-domain/entities/academic/Schedule";

export function ScheduleDayPanel({ index, day, children }: { index: number; day?: ScheduleDay; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const name = DAYS[index];
  const id = `schedule-day-content-${index + 1}`;
  return <article className={`schedule-day schedule-day-panel ${expanded ? "is-expanded" : "is-collapsed"}`}>
    <h2 className={`schedule-day-heading schedule-day-heading--${index + 1}`} aria-label={name}>
      <button type="button" className="schedule-day-toggle" aria-label={`${expanded ? "Plegar" : "Desplegar"} ${name}`}
        aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
        <span>{name}</span><FcExpand aria-hidden="true" />
      </button>
    </h2>
    <p className="schedule-day-overview">{day ? `${timeLabel(day.entryTime) || "--:--"} – ${timeLabel(day.exitTime) || "--:--"} · ${day.blocks.length} bloques` : "Sin configurar"}</p>
    <div className="schedule-day-collapse" id={id} inert={!expanded} aria-hidden={!expanded}>
      <div className="schedule-day-collapse-inner">{children}</div>
    </div>
  </article>;
}
