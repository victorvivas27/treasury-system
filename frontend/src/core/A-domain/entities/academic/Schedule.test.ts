import { describe, expect, it } from "vitest";
import { blockDurationLabel, mergeConsecutiveSubjects } from "./Schedule";
import type { ScheduleBlock, ScheduleDay } from "./Schedule";

const block = (startTime: string, endTime: string, name = "Matemática", type: ScheduleBlock["type"] = "SUBJECT"): ScheduleBlock =>
  ({ dayOfWeek: 1, startTime, endTime, name, type, order: 0, color: null });
const day = (...blocks: ScheduleBlock[]): ScheduleDay =>
  ({ dayOfWeek: 1, entryTime: "08:00", exitTime: "14:00", blocks });

describe("Materias consecutivas", () => {
  it("une varios bloques contiguos y calcula su duración sin modificar los originales", () => {
    const original = day(block("08:00", "08:45"), block("08:45:00", "09:30:00"), block("09:30", "10:15"));
    const result = mergeConsecutiveSubjects(original);
    expect(result.blocks).toHaveLength(1);
    expect(blockDurationLabel(result.blocks[0])).toBe("135 min");
    expect(original.blocks[0].endTime).toBe("08:45");
    expect(original.blocks).toHaveLength(3);
  });
  it("conserva la separación cuando hay un recreo, un espacio o materias distintas", () => {
    const original = day(block("08:00", "08:45"), block("08:45", "09:00", "Recreo", "BREAK"),
      block("09:00", "09:45"), block("10:00", "10:45"), block("10:45", "11:30", "Lenguaje"));
    expect(mergeConsecutiveSubjects(original).blocks).toHaveLength(5);
  });
});
