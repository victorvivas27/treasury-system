import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { FiSliders } from "react-icons/fi";
import { DAYS, TYPES, orderedBlocks, timeLabel } from "@/core/A-domain/entities/academic/Schedule";
import type { ScheduleBlock, ScheduleDay } from "@/core/A-domain/entities/academic/Schedule";
import { useSchedule } from "@/presentation/hooks/academic/useSchedule";
import { useAuth } from "@/presentation/context/AuthContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { Button } from "@/shared/ui/button/Button";
import { ScheduleSkeleton } from "./ScheduleSkeleton";
import { ScheduleFilter } from "./ScheduleFilter";
import { ScheduleDayPanel } from "./ScheduleDayPanel";
import "./Schedule.css";

type View = "summary" | "day" | "table";
const blockColors = { SUBJECT: "#5276df", ACTIVITY: "#a855f7", BREAK: "#22a06b", SNACK: "#d47749", LUNCH: "#d99024" };
const blockStyle = (block: ScheduleBlock): CSSProperties => ({
  "--schedule-block-color": block.color || blockColors[block.type],
} as CSSProperties);
const preferredView = (key: string): View => {
  try { const stored = localStorage.getItem(key); return stored === "day" || stored === "table" ? stored : "summary"; }
  catch { return "summary"; }
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
  const renderDay = (day: ScheduleDay | undefined, index: number) => <ScheduleDayPanel index={index} day={day} key={`${key}:${data.year}:${view}:${index}`}>
    {day ? <><p>Entrada <strong>{timeLabel(day.entryTime)}</strong> · <span className="schedule-exit">Salida <strong>{timeLabel(day.exitTime)}</strong></span></p>
      {orderedBlocks(day).length ? <ol className="schedule-blocks">{orderedBlocks(day).map((block, position) =>
        <li className="schedule-published-block" key={position} style={blockStyle(block)}>
          <small className="schedule-published-type">{block.type === "ACTIVITY" ? "Evento / actividad" : TYPES[block.type]}</small>
          {(block.type === "SUBJECT" || block.type === "ACTIVITY") && block.name && <strong title={block.name}>{block.name}</strong>}
          <span>{timeLabel(block.startTime)} – {timeLabel(block.endTime)}</span>
        </li>)}</ol> : <p>Sin bloques programados.</p>}</> : <p>Sin jornada publicada.</p>}
  </ScheduleDayPanel>;
  return <section className="schedule-page">
    <header><h1>Horario de clases</h1>{isAdminRole(user?.rol) && <Link className="schedule-manage-link" to="/admin/horario-clases">
      <FiSliders aria-hidden="true" /><span>Gestionar horario</span>
    </Link>}</header>
    <div className="schedule-filters">
    <ScheduleFilter label="Año escolar" loading={data.loading}><select value={data.year ?? ""} disabled={data.loading} onChange={event => data.setYear(Number(event.target.value))}>
      {data.periods.map(period => <option key={period.schoolYear} value={period.schoolYear}>{period.schoolYear} · {period.course}</option>)}
    </select></ScheduleFilter>
    <ScheduleFilter label="Vista" loading={false} compact><select value={view} onChange={event => setPreference({ key, view: event.target.value as View })}>
      <option value="summary">Semanal resumida</option><option value="day">Por día</option><option value="table">Tabla semanal</option>
    </select></ScheduleFilter>
    </div>
    {view === "day" && <div className="schedule-filters"><ScheduleFilter label="Día" loading={false} compact>
      <select value={dayNumber} onChange={event => setDayNumber(Number(event.target.value))}>
        {DAYS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
      </select>
    </ScheduleFilter></div>}
    {data.loading ? <ScheduleSkeleton view={view} dayNumber={dayNumber} /> : data.error ? <div role="alert">{data.error}<Button label="Reintentar" onClick={data.retry} /></div>
      : !data.schedule.days.length ? <p role="status">Todavía no hay un horario publicado para este año. La administración lo publicará cuando esté listo.</p>
      : view === "summary" ? <div className="schedule-week">{days.map(renderDay)}</div>
      : view === "day" ? renderDay(days[dayNumber - 1], dayNumber - 1)
      : <div className="schedule-table-scroll" tabIndex={0} role="region" aria-label="Tabla semanal, desplazamiento horizontal">
        <table className="schedule-table"><caption>Horario semanal · {data.year}</caption>
          <thead><tr><th scope="col">Franja</th>{DAYS.map((name, index) => <th scope="col" key={name}>
            <span className={`schedule-table-day-heading schedule-day-heading--${index + 1}`}>{name}</span>
            {days[index] && <p>Entrada {timeLabel(days[index]!.entryTime)}<br /><span className="schedule-exit">Salida {timeLabel(days[index]!.exitTime)}</span></p>}</th>)}</tr></thead>
          <tbody>{boundaries.slice(0, -1).map((start, index) => {
            const end = boundaries[index + 1];
            return <tr key={start} style={{ height: Math.max(32, (minutes(end) - minutes(start)) * 1.2) }}>
              <th scope="row">{timeLabel(start)} – {timeLabel(end)}</th>
              {days.map((day, dayIndex) => {
                const block = day?.blocks.find(value => value.startTime <= start && value.endTime >= end);
                return <td key={dayIndex}>{block ? <span className="schedule-cell schedule-published-block" style={blockStyle(block)}>
                  <small className="schedule-published-type">{block.type === "ACTIVITY" ? "Evento / actividad" : TYPES[block.type]}</small>{(block.type === "SUBJECT" || block.type === "ACTIVITY") && block.name && <strong title={block.name}>{block.name}</strong>}
                  <small>{timeLabel(block.startTime)} – {timeLabel(block.endTime)}</small>
                </span> : day && start >= day.entryTime && end <= day.exitTime ? "Libre" : "—"}</td>;
              })}</tr>;
          })}</tbody>
        </table></div>}
  </section>;
}
