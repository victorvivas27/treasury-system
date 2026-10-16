import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { FiSliders } from "react-icons/fi";
import { DAYS, TYPES, blockDurationLabel, timeLabel } from "@/core/A-domain/entities/academic/Schedule";
import type { ScheduleBlock } from "@/core/A-domain/entities/academic/Schedule";
import { useSchedule } from "@/presentation/hooks/academic/useSchedule";
import { useAuth } from "@/presentation/context/AuthContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { Button } from "@/shared/ui/button/Button";
import { ScheduleSkeleton } from "./ScheduleSkeleton";
import { ScheduleFilter } from "./ScheduleFilter";
import { ScheduleAgenda } from "./ScheduleAgenda";
import { ScheduleBlockIcon } from "./ScheduleBlockIcon";
import { scheduleCardColor } from "./scheduleCards";
import "./Schedule.css";
import "./SchedulePublished.css";

type View = "summary" | "day" | "table";
const blockStyle = (block: ScheduleBlock): CSSProperties => ({
  "--schedule-block-color": scheduleCardColor(block),
} as CSSProperties);
const preferredView = (key: string): View => {
  try { const stored = localStorage.getItem(key); return stored === "summary" || stored === "table" ? stored : "day"; }
  catch { return "day"; }
};
export function SchedulePage() {
  const data = useSchedule(false);
  const { user } = useAuth();
  const key = `academic.schedule.view.${user?.id ?? "anonymous"}`;
  const [preference, setPreference] = useState(() => ({ key, view: preferredView(key) }));
  const view = preference.key === key ? preference.view : preferredView(key);
  const [dayNumber, setDayNumber] = useState(1);
  useEffect(() => { try { localStorage.setItem(key, view); } catch { /* Local preference is optional. */ } }, [key, view]);
  const days = DAYS.map((_, index) => data.schedule.days.find(day => day.dayOfWeek === index + 1));
  const boundaries = [...new Set(days.flatMap(day => day
    ? [day.entryTime, day.exitTime, ...day.blocks.flatMap(block => [block.startTime, block.endTime])] : []))].sort();
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return <section className="schedule-page schedule-published">
    <header className="schedule-published-heading"><div><h1>Horario de clases</h1><p>Tu día, materia por materia.</p></div>{isAdminRole(user?.rol) && <Link className="schedule-manage-link" to="/admin/horario-clases">
      <FiSliders aria-hidden="true" /><span>Gestionar horario</span>
    </Link>}</header>
    <div className="schedule-published-toolbar"><div className="schedule-filters">
    <ScheduleFilter label="Año escolar" loading={data.loading}><select value={data.year ?? ""} disabled={data.loading} onChange={event => data.setYear(Number(event.target.value))}>
      {data.periods.map(period => <option key={period.schoolYear} value={period.schoolYear}>{period.schoolYear} · {period.course}</option>)}
    </select></ScheduleFilter>
    </div>
    <div className="schedule-visible-filter">
      <span id="schedule-view-label">Vista</span>
      <div className="schedule-day-selector schedule-view-selector" role="group" aria-labelledby="schedule-view-label">
        {([ ["summary", "Semanal resumida"], ["day", "Por día"], ["table", "Tabla semanal"] ] as const).map(([value, label]) =>
          <button type="button" key={value} aria-pressed={view === value} onClick={() => setPreference({ key, view: value })}>{label}</button>)}
      </div>
    </div>
    </div>
    {view === "day" && <div className="schedule-visible-filter schedule-day-nav">
      <span id="schedule-day-label">Día</span>
      <div className="schedule-day-selector" role="group" aria-labelledby="schedule-day-label">
        {["Lun", "Mar", "Mié", "Jue", "Vie"].map((label, index) => <button type="button" key={label}
          aria-label={DAYS[index]} aria-pressed={dayNumber === index + 1} onClick={() => setDayNumber(index + 1)}><span>{label}</span><small>{days[index] ? `Salida ${timeLabel(days[index]!.exitTime)}` : "Sin jornada"}</small></button>)}
      </div>
    </div>}
    {data.loading ? <ScheduleSkeleton view={view} dayNumber={dayNumber} /> : data.error ? <div role="alert">{data.error}<Button label="Reintentar" onClick={data.retry} /></div>
      : !data.schedule.days.length ? <p role="status">Todavía no hay un horario publicado para este año. La administración lo publicará cuando esté listo.</p>
      : view === "summary" ? <div className="schedule-agenda-week">{days.map((day, index) => <ScheduleAgenda day={day} index={index} compact key={index} />)}</div>
      : view === "day" ? <ScheduleAgenda day={days[dayNumber - 1]} index={dayNumber - 1} />
      : <div className="schedule-table-scroll" tabIndex={0} role="region" aria-label="Tabla semanal, desplazamiento horizontal">
        <table className="schedule-table"><caption>Horario semanal · {data.year}</caption>
          <thead><tr>{DAYS.map((name, index) => <th scope="col" key={name}>
            <span className={`schedule-table-day-heading schedule-day-heading--${index + 1}`}>{name}</span>
            {days[index] && <p>Entrada {timeLabel(days[index]!.entryTime)}<br /><span className="schedule-exit">Salida {timeLabel(days[index]!.exitTime)}</span></p>}</th>)}</tr></thead>
          <tbody>{boundaries.slice(0, -1).map((start, index) => {
            const end = boundaries[index + 1];
            return <tr key={start} style={{ height: Math.max(32, (minutes(end) - minutes(start)) * 1.2) }}>
              {days.map((day, dayIndex) => {
                const block = day?.blocks.find(value => value.startTime <= start && value.endTime >= end);
                if (block && block.startTime < start) return null;
                const rowSpan = block ? boundaries.filter(boundary => boundary >= start && boundary < block.endTime).length : 1;
                return <td key={dayIndex} rowSpan={rowSpan}>{block ? <span className="schedule-cell schedule-published-block" style={blockStyle(block)}>
                  <span className="schedule-table-block-heading"><ScheduleBlockIcon block={block} /><small className="schedule-published-type">{TYPES[block.type]}</small></span>{(block.type === "SUBJECT" || block.type === "ACTIVITY" || block.type === "EVENT") && block.name && <strong title={block.name}>{block.name}</strong>}
                  <small><span className="schedule-table-time-range">{timeLabel(block.startTime)} – {timeLabel(block.endTime)}</span>{blockDurationLabel(block) && <span className="schedule-block-duration">{blockDurationLabel(block)}</span>}</small>
                </span> : day && start >= day.entryTime && end <= day.exitTime ? "Libre" : "—"}</td>;
              })}</tr>;
          })}</tbody>
        </table></div>}
  </section>;
}
