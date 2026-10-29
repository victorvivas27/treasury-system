import { DAYS } from "@/core/A-domain/entities/academic/Schedule";
import { Skeleton, TableSkeleton } from "@/shared/ui/skeleton/Skeleton";

export function PublishedScheduleSkeleton({ view, dayNumber }: {
  view: "summary" | "day" | "table"; dayNumber: number;
}) {
  if (view === "table") return <div className="schedule-table-scroll" role="status" aria-label="Cargando horario" aria-busy="true">
    <table className="schedule-table"><thead><tr>{DAYS.map(day => <th key={day}>{day}</th>)}</tr></thead>
      <TableSkeleton rows={4} columns={5} /></table>
  </div>;
  const days = view === "summary" ? DAYS : [DAYS[dayNumber - 1]];
  return <div className={view === "summary" ? "schedule-agenda-week" : undefined}
    role="status" aria-label="Cargando horario" aria-busy="true">
    {days.map(day => <article key={day} className={`schedule-agenda schedule-agenda--${view === "summary" ? "compact" : "day"}`}>
      <div className="schedule-agenda-heading"><h2>{day}</h2><Skeleton width="35%" /></div>
      <ol className="schedule-agenda-list" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => <li className="schedule-agenda-card" key={index}>
          <span className="schedule-agenda-time"><Skeleton width="5ch" /><Skeleton width="5ch" /></span>
          <div className="schedule-agenda-subject"><strong><Skeleton width="16ch" /></strong><small><Skeleton width="10ch" /></small></div>
        </li>)}
      </ol>
    </article>)}
  </div>;
}
