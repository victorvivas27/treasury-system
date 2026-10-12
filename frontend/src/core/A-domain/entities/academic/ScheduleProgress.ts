import { validateSchedule } from "./Schedule";
import type { ScheduleDay } from "./Schedule";

const minutes = (value: string): number | null => {
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(value)) return null;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
};

export const durationLabel = (value: number) => {
  const hours = Math.floor(value / 60), remainder = value % 60;
  return hours ? `${hours} h${remainder ? ` ${remainder} min` : ""}` : `${remainder} min`;
};

export function scheduleProgress(day: ScheduleDay) {
  const entry = minutes(day.entryTime), exit = minutes(day.exitTime);
  if (entry === null || exit === null || entry >= exit) return null;
  const ranges: [number, number][] = [];
  for (const block of day.blocks) {
    const start = minutes(block.startTime), end = minutes(block.endTime);
    if (start === null || end === null || start >= end) continue;
    const from = Math.max(entry, start), to = Math.min(exit, end);
    if (from < to) ranges.push([from, to]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let covered = 0, previousEnd = entry;
  for (const [start, end] of ranges) {
    covered += Math.max(0, end - Math.max(start, previousEnd));
    previousEnd = Math.max(previousEnd, end);
  }
  const total = exit - entry, remaining = total - covered;
  return { total, covered, remaining, complete: remaining === 0 && validateSchedule({ days: [day] }) === null };
}
