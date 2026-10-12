import { describe, expect, it, vi } from "vitest";
import { ScheduleUseCases } from "./ScheduleUseCases";
import type { Schedule } from "@/core/A-domain/entities/academic/Schedule";
const make = (): Schedule => ({ days: [{ dayOfWeek: 1, entryTime: "12:00", exitTime: "16:00", blocks: [
  { dayOfWeek: 1, startTime: "12:00", endTime: "12:45", type: "SUBJECT", name: "Lenguaje", color: null, order: 0 },
] }] });
const repository = () => ({ periods: vi.fn(), read: vi.fn(), save: vi.fn().mockResolvedValue(make()), delete: vi.fn() });
describe("ScheduleUseCases", () => {
  it("rechaza solapamientos y no persiste", async () => {
    const repo = repository(), service = new ScheduleUseCases(repo), schedule = make();
    schedule.days[0].blocks.push({ ...schedule.days[0].blocks[0], type: "BREAK", startTime: "12:30", endTime: "13:00" });
    await expect(service.save(2026, schedule, false)).rejects.toThrow("superpuestos");
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("rechaza bloques fuera de jornada, tiempos inversos y materia vacía", async () => {
    const repo = repository(), service = new ScheduleUseCases(repo);
    for (const change of [{ endTime: "17:00" }, { startTime: "13:00" }, { name: "" }]) {
      const schedule = make(); Object.assign(schedule.days[0].blocks[0], change);
      await expect(service.save(2026, schedule, false)).rejects.toThrow();
    }
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("requiere cinco jornadas para publicar y permite borradores parciales", async () => {
    const repo = repository(), service = new ScheduleUseCases(repo), schedule = make();
    await expect(service.save(2026, schedule, true)).rejects.toThrow("cinco jornadas");
    await service.save(2026, schedule, false);
    expect(repo.save).toHaveBeenCalledWith(2026, schedule, false);
  });
  it("permite huecos, recreos sin materia y salida independiente", async () => {
    const repo = repository(), service = new ScheduleUseCases(repo), schedule = make();
    schedule.days[0].blocks.push({ ...schedule.days[0].blocks[0], type: "BREAK", name: null, startTime: "13:00", endTime: "13:15" });
    await service.save(2026, schedule, false);
    expect(repo.save).toHaveBeenCalledOnce();
  });
  it("admite horas recuperadas con segundos cero junto a nuevas horas del editor", async () => {
    const repo = repository(), service = new ScheduleUseCases(repo), schedule = make();
    schedule.days[0].entryTime = "12:00:00";
    schedule.days[0].exitTime = "16:00:00";
    schedule.days[0].blocks[0].endTime = "12:45:00";
    schedule.days[0].blocks.push({ ...schedule.days[0].blocks[0], type: "BREAK", name: null, startTime: "12:45", endTime: "13:00" });
    await service.save(2026, schedule, false);
    expect(repo.save).toHaveBeenCalledOnce();
  });
  it("guarda una materia de dos horas y también permite duraciones mayores", async () => {
    const repo = repository(), service = new ScheduleUseCases(repo), schedule = make();
    schedule.days[0].blocks[0].name = "Matemática";
    schedule.days[0].blocks[0].endTime = "14:00";
    await service.save(2026, schedule, false);
    expect(repo.save).toHaveBeenCalledWith(2026, schedule, false);
    schedule.days[0].blocks[0].endTime = "15:00";
    await service.save(2026, schedule, false);
    expect(repo.save).toHaveBeenCalledTimes(2);
  });
});
