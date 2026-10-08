import { describe, expect, it } from "vitest";
import type { TreasuryDashboardOverview } from "@/core/A-domain/entities/treasury/Treasury";
import { buildCashflowTimeline } from "./buildCashflowTimeline";

describe("buildCashflowTimeline", () => {
  it("mantiene 12 meses, agrupa cuotas y conceptos y separa ingresos de egresos", () => {
    const data = { recentMovements: [
      { type: "CUOTA", description: "Cuota · Familia #1", amount: 200000, date: "2026-03-01", status: "ACTIVE" },
      { type: "CUOTA", description: "Cuota · Familia #2", amount: 200000, date: "2026-03-31", status: "ACTIVE" },
      { type: "INGRESO", description: "Rifa", amount: 200000, date: "2026-03-10", status: "ACTIVE" },
      { type: "EGRESO", description: "Materiales", amount: 50000, date: "2026-04-01", status: "ACTIVE" },
      { type: "INGRESO", description: "Anulado", amount: 999, date: "2026-03-10", status: "CANCELLED" },
      { type: "INGRESO", description: "Otro año", amount: 999, date: "2025-03-10", status: "ACTIVE" },
    ] } as TreasuryDashboardOverview;
    const months = buildCashflowTimeline(data, 2026);
    expect(months).toHaveLength(12);
    expect(months[0].name).toBe("enero");
    expect(months[11].name).toBe("diciembre");
    expect(months[2].income).toBe(600000);
    expect(months[2].incomes).toEqual([["Cuotas", 400000], ["Rifa", 200000]]);
    expect(months[2].expense).toBe(0);
    expect(months[3].income).toBe(0);
    expect(months[3].expenses).toEqual([["Materiales", 50000]]);
    expect(months[0].incomes).toEqual([]);
    expect(buildCashflowTimeline(data, 2027).every(month => month.income === 0 && month.expense === 0)).toBe(true);
  });
});
