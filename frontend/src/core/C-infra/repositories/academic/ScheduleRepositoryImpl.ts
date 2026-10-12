import type { Schedule, SchoolPeriod } from "@/core/A-domain/entities/academic/Schedule";
import type { IScheduleRepository } from "@/core/A-domain/repository/academic/IScheduleRepository";
import { apiClient } from "@/core/D-config/api";
export class ScheduleRepositoryImpl implements IScheduleRepository {
  private readonly base = "/academic/schedules";
  async periods(signal?: AbortSignal) {
    return (await apiClient.get<SchoolPeriod[]>(`${this.base}/periods`, { signal })).data;
  }
  async read(year: number, draft: boolean, signal?: AbortSignal) {
    return (await apiClient.get<Schedule>(`${this.base}/${year}${draft ? "/draft" : ""}`, { signal })).data;
  }
  async save(year: number, schedule: Schedule, publish: boolean) {
    return (await apiClient.put<Schedule>(`${this.base}/${year}`, schedule, { params: { publish } })).data;
  }
  async delete(year: number) { await apiClient.delete(`${this.base}/${year}`); }
}
