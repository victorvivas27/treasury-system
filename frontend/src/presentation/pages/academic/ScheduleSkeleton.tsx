import { DAYS } from "@/core/A-domain/entities/academic/Schedule";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import { FcExpand } from "react-icons/fc";
import "./ScheduleSkeleton.css";

export function ScheduleSkeleton({ view = "summary", dayNumber = 1 }: {
  view?: "summary" | "day" | "table" | "management";
  dayNumber?: number;
}) {
  return <div className="schedule-skeleton" role="status" aria-label="Cargando horario" aria-busy="true">
    {view === "table" ? <div className="schedule-table-scroll" aria-hidden="true">
      <table className="schedule-table">
        <caption>Horario semanal</caption>
        <thead><tr>{DAYS.map((day, index) => <th key={day}>
          <span className={`schedule-table-day-heading schedule-day-heading--${index + 1}`}>{day}</span>
          <div className="schedule-skeleton-table-times">
            <Skeleton width="75%" height=".8rem" /><Skeleton width="65%" height=".8rem" />
          </div>
        </th>)}</tr></thead>
        <tbody>{Array.from({ length: 5 }, (_, row) => <tr key={row}>
          {DAYS.map(day => <td key={day}><div className="schedule-skeleton-cell">
            <Skeleton width="3rem" height=".8rem" />
            <Skeleton width="70%" height=".75rem" />
            <Skeleton width="55%" height=".65rem" />
          </div></td>)}
        </tr>)}</tbody>
      </table>
    </div> : view !== "management" ? <div className={view === "summary" ? "schedule-agenda-week" : undefined} aria-hidden="true">
      {(view === "day" ? DAYS.slice(dayNumber - 1, dayNumber) : DAYS).map(day => <article
        className={`schedule-agenda schedule-skeleton-agenda${view === "summary" ? " schedule-agenda--compact" : ""}`} key={day}>
        <div className="schedule-agenda-heading">
          <div><h2>{day}</h2><Skeleton width="10rem" height=".75rem" /></div>
          <div className="schedule-agenda-exit"><span><Skeleton width="2rem" height=".65rem" /><Skeleton width="3rem" height="1.15rem" /></span></div>
        </div>
        <ol className="schedule-agenda-list">
          {Array.from({ length: 4 }, (_, index) => <li className="schedule-agenda-card" key={index}>
            <span className="schedule-agenda-time"><Skeleton width="2.5rem" height=".85rem" /><Skeleton width="2.5rem" height=".75rem" /></span>
            <Skeleton className="schedule-skeleton-icon" />
            <div className="schedule-agenda-subject"><Skeleton width="70%" height=".95rem" /><Skeleton width="40%" height=".7rem" /></div>
            <span className="schedule-agenda-duration"><Skeleton width="2.5rem" height=".7rem" /></span>
          </li>)}
        </ol>
      </article>)}
    </div> : <div aria-hidden="true">
      <div className="schedule-week">
        {DAYS.map((day, index) => <div
          className="schedule-day schedule-day-panel is-collapsed schedule-skeleton-card" key={day}>
          <h2 className={`schedule-day-heading schedule-day-heading--${index + 1}`}>
            <span className="schedule-skeleton-heading">{day}</span>
            <FcExpand aria-hidden="true" />
          </h2>
          <p className="schedule-day-overview schedule-skeleton-overview">
            <Skeleton width="5.5rem" height=".7rem" />
            <Skeleton width="3.5rem" height=".7rem" />
          </p>
        </div>)}
      </div>
    </div>}
  </div>;
}
