import { durationLabel, scheduleProgress } from "@/core/A-domain/entities/academic/ScheduleProgress";
import type { ScheduleDay } from "@/core/A-domain/entities/academic/Schedule";

export function ScheduleDayProgress({ day, name }: { day: ScheduleDay; name: string }) {
  const progress = scheduleProgress(day);
  if (!progress) return <p className="schedule-day-progress-hint">Selecciona entrada y salida para calcular la jornada.</p>;
  return <div className={`schedule-day-progress ${progress.complete ? "is-complete" : ""}`} role="status" aria-label={`Tiempo de la jornada · ${name}`}>
    <div className="schedule-day-progress-counts">
      <span>Jornada <strong>{durationLabel(progress.total)}</strong></span>
      <span>Cubierto <strong>{durationLabel(progress.covered)}</strong></span>
      <span className="schedule-day-progress-remaining">{progress.complete ? "Día completo" : progress.remaining === 0 ? "Revisa los bloques" : `Faltan ${durationLabel(progress.remaining)}`}</span>
    </div>
    <progress max={progress.total} value={progress.covered} aria-label={`Tiempo cubierto · ${name}`} />
  </div>;
}
