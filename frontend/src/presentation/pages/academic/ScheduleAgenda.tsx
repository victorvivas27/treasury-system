import type { CSSProperties } from "react";
import { FiClock, FiLogIn } from "react-icons/fi";
import { ScheduleBlockIcon } from "./ScheduleBlockIcon";
import { DAYS, TYPES, blockDurationLabel, orderedBlocks, timeLabel, type ScheduleDay } from "@/core/A-domain/entities/academic/Schedule";
import { scheduleCardColor, scheduleIngress } from "./scheduleCards";

export function ScheduleAgenda({ day, index, compact = false }: { day?: ScheduleDay; index: number; compact?: boolean }) {
  const blocks = day ? orderedBlocks(day) : [];
  const ingress = day ? scheduleIngress(day) : null;
  return <article className={`schedule-agenda${compact ? " schedule-agenda--compact" : ""}`} aria-label={`Jornada · ${DAYS[index]}`}>
    <div className="schedule-agenda-heading">
      <div><h2>{DAYS[index]}</h2>
        <p>{day ? `Entrada ${timeLabel(day.entryTime)} · ${blocks.length} bloques programados` : "Sin jornada publicada"}</p></div>
      {day && <div className="schedule-agenda-exit"><FiClock aria-hidden="true" /><span>Salida<strong>{timeLabel(day.exitTime)}</strong></span></div>}
    </div>
    {day && <ol className="schedule-agenda-list" aria-label={`Bloques · ${DAYS[index]}`}>
      {ingress && <li className="schedule-agenda-card schedule-agenda-ingress">
        <span className="schedule-agenda-time"><time>{ingress.start}</time><time>{ingress.end}</time></span>
        <FiLogIn aria-hidden="true" /><div className="schedule-agenda-subject"><strong>Ingreso</strong><small>Inicio de la jornada</small></div>
      </li>}
      {blocks.map((block, position) => {
        const named = block.type === "SUBJECT" || block.type === "ACTIVITY" || block.type === "EVENT";
        const title = named ? block.name?.trim() || TYPES[block.type] : TYPES[block.type];
        return <li key={position} className="schedule-agenda-card" style={{ "--agenda-color": scheduleCardColor(block) } as CSSProperties}>
          <span className="schedule-agenda-time"><time>{timeLabel(block.startTime)}</time><time>{timeLabel(block.endTime)}</time></span>
          <ScheduleBlockIcon block={block} /><div className="schedule-agenda-subject"><strong>{title}</strong>{named && <small>{TYPES[block.type]}</small>}</div>
          {blockDurationLabel(block) && <span className="schedule-agenda-duration">{blockDurationLabel(block)}</span>}
        </li>;
      })}
    </ol>}
    {day && !blocks.length && <p className="schedule-agenda-empty">Sin bloques programados.</p>}
  </article>;
}
