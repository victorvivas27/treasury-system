import { describe, expect, it } from "vitest";
import { durationLabel, scheduleProgress } from "./ScheduleProgress";
import type { ScheduleBlock, ScheduleDay } from "./Schedule";

const block = (startTime: string, endTime: string): ScheduleBlock => ({ dayOfWeek: 1, startTime, endTime,
  type: "SUBJECT", name: "Materia", order: 0, color: null });
const day = (...blocks: ScheduleBlock[]): ScheduleDay => ({ dayOfWeek: 1, entryTime: "07:00", exitTime: "15:30", blocks });

describe("Tiempo cubierto de la jornada", () => {
  it("calcula 8 h 30 min entre 07:00 y 15:30 y descuenta los bloques", () => {
    expect(scheduleProgress(day(block("07:00", "08:30")))).toEqual({ total: 510, covered: 90, remaining: 420, complete: false });
    expect(durationLabel(510)).toBe("8 h 30 min");
    expect(durationLabel(60)).toBe("1 h");
    expect(durationLabel(0)).toBe("0 min");
  });
  it("no cuenta dos veces los solapamientos ni horas fuera de la jornada", () => {
    expect(scheduleProgress(day(block("06:00", "10:00"), block("09:00", "16:00")))).toEqual({
      total: 510, covered: 510, remaining: 0, complete: false,
    });
  });
  it("conserva los huecos como tiempo pendiente e ignora bloques incompletos", () => {
    expect(scheduleProgress(day(block("07:00", "08:00"), block("09:00", "10:00"), block("", "11:00"))))
      .toEqual({ total: 510, covered: 120, remaining: 390, complete: false });
  });
  it("marca completo solo un día válido cubierto incluyendo recreos y colación", () => {
    const value = day(block("07:00:00", "10:00:00"), { ...block("10:00", "10:30"), type: "SNACK", name: null }, block("10:30", "15:30"));
    expect(scheduleProgress(value)).toEqual({ total: 510, covered: 510, remaining: 0, complete: true });
    value.blocks[0].name = "";
    expect(scheduleProgress(value)?.complete).toBe(false);
  });
  it("no calcula una jornada con entrada o salida inválida", () => {
    expect(scheduleProgress({ ...day(), entryTime: "" })).toBeNull();
    expect(scheduleProgress({ ...day(), exitTime: "06:00" })).toBeNull();
  });
});
