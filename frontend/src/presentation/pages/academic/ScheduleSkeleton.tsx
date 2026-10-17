import { DAYS } from "@/core/A-domain/entities/academic/Schedule";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
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
      <div className="schedule-day-selector schedule-skeleton-selector">
        {DAYS.map(day => <span key={day}><Skeleton width="2rem" height=".85rem" /></span>)}
      </div>
      <div className="schedule-week">
        <article className="schedule-day schedule-daily-editor schedule-skeleton-editor">
          <div className="schedule-daily-heading"><h2>{DAYS[dayNumber - 1]}</h2>
            <span><Skeleton width="5rem" height=".85rem" /></span>
          </div>
          {Array.from({ length: 3 }, (_, index) => <div className="schedule-editor-block schedule-skeleton-editor-block" key={index}>
            <div className="schedule-block-summary">
              <span className="schedule-block-summary-time"><Skeleton width="3rem" height=".75rem" /><Skeleton width="3rem" height=".75rem" /></span>
              <span className="schedule-block-summary-name"><Skeleton width="60%" height=".95rem" /></span>
              <span className="schedule-block-summary-action"><Skeleton width="2rem" height=".75rem" /></span>
            </div>
          </div>)}
          <div className="schedule-day-times">
            {[0, 1].map(index => <div className="schedule-skeleton-time-field" key={index}>
              <Skeleton width="3rem" height=".75rem" /><Skeleton height="2.4rem" />
            </div>)}
          </div>
          <div className="schedule-day-progress"><Skeleton height=".7rem" /></div>
          <Skeleton width="8rem" height="2.75rem" />
        </article>
      </div>
    </div>}
  </div>;
}
