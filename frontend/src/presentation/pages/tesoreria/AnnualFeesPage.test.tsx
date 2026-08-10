import { describe, expect, it } from "vitest";
import type { FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import type { FamilyPlan, FeeObligation } from "@/core/A-domain/entities/treasury/Treasury";
import { findUnconfiguredFamilies } from "./AnnualFeesPage";

const family = (familiaId: number) => ({ familiaId } as FamiliaDetalle);
const plan = (familyId: number) => ({ familyId } as FamilyPlan);
const obligation = (familyId: number) => ({ familyId } as FeeObligation);

describe("findUnconfiguredFamilies", () => {
  it("no marca como pendientes las familias que ya tienen modalidad", () => {
    const result = findUnconfiguredFamilies(
      [family(1), family(2), family(3)], [plan(1), plan(2)], []);

    expect(result.map(item => item.familiaId)).toEqual([3]);
  });

  it("reconoce una familia configurada por sus obligaciones existentes", () => {
    const result = findUnconfiguredFamilies(
      [family(1), family(2)], [], [obligation(1), obligation(2)]);

    expect(result).toEqual([]);
  });

  it("normaliza identificadores recibidos como texto desde la API", () => {
    const textPlan = { familyId: "23" } as unknown as FamilyPlan;

    expect(findUnconfiguredFamilies([family(23)], [textPlan], [])).toEqual([]);
  });
});
