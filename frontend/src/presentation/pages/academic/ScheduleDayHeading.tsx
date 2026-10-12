import { DAYS } from "@/core/A-domain/entities/academic/Schedule";

export function ScheduleDayHeading({ index }: { index: number }) {
  return <h2 className={`schedule-day-heading schedule-day-heading--${index + 1}`}>
    {DAYS[index]}
  </h2>;
}
