import type { Schedule, SchoolPeriod } from "../../entities/academic/Schedule";
export interface IScheduleRepository {
  periods(signal?: AbortSignal): Promise<SchoolPeriod[]>;
  read(year: number, draft: boolean, signal?: AbortSignal): Promise<Schedule>;
  save(year: number, schedule: Schedule, publish: boolean): Promise<Schedule>;
  delete(year: number): Promise<void>;
}
