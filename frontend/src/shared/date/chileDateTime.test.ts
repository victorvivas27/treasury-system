import { describe, expect, it } from "vitest";
import { chileDate, chileTime } from "./chileDateTime";

describe("chileDateTime", () => {
  it("mantiene la hora local enviada por el backend", () => {
    expect(chileTime("2026-08-12T22:15:00")).toBe("22:15");
  });

  it("convierte timestamps UTC a America/Santiago", () => {
    expect(chileTime("2026-08-13T02:15:00Z")).toBe("22:15");
    expect(chileDate(new Date("2026-08-13T02:15:00Z"))).toBe("2026-08-12");
  });
});
