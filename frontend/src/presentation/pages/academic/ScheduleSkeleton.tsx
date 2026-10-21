import { DAYS } from "@/core/A-domain/entities/academic/Schedule";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import "./ScheduleSkeleton.css";

export function ScheduleSkeleton({ dayNumber = 1 }: { dayNumber?: number }) {
  return <div className="schedule-skeleton" role="status" aria-label="Cargando horario" aria-busy="true">
    <div aria-hidden="true">
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
    </div>
  </div>;
}
