import type { Schedule } from "@/core/A-domain/entities/academic/Schedule";
import { validateSchedule } from "@/core/A-domain/entities/academic/Schedule";
import type { IScheduleRepository } from "@/core/A-domain/repository/academic/IScheduleRepository";
export class ScheduleUseCases {
  private readonly repository: IScheduleRepository;
  constructor(repository: IScheduleRepository) { this.repository = repository; }
  periods(signal?: AbortSignal) { return this.repository.periods(signal); }
  read(year: number, draft: boolean, signal?: AbortSignal) { return this.repository.read(year, draft, signal); }
  save(year: number, schedule: Schedule, publish: boolean) {
    const error = validateSchedule(schedule, publish);
    if (error) return Promise.reject(new Error(error));
    return this.repository.save(year, schedule, publish);
  }
  delete(year: number) { return this.repository.delete(year); }
}
