import type { TreasuryDashboardOverview } from "@/core/A-domain/entities/treasury/Treasury";

export function buildCashflowTimeline(data: TreasuryDashboardOverview, year: number) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    name: new Intl.DateTimeFormat("es-CL", { month: "long" }).format(new Date(year, index, 1)),
    income: 0, expense: 0,
    incomes: new Map<string, number>(), expenses: new Map<string, number>(),
  }));
  for (const movement of data.recentMovements) {
    if (movement.status !== "ACTIVE") continue;
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(movement.date);
    if (!match || Number(match[1]) !== year) continue;
    const month = months[Number(match[2]) - 1];
    if (!month) continue;
    const expense = movement.type === "EGRESO";
    const groups = expense ? month.expenses : month.incomes;
    const concept = movement.type === "CUOTA" ? "Cuotas" : movement.description.trim() || "Otros";
    groups.set(concept, (groups.get(concept) ?? 0) + movement.amount);
    if (expense) month.expense += movement.amount;
    else month.income += movement.amount;
  }
  return months.map(month => ({ ...month,
    incomes: [...month.incomes].sort((a, b) => b[1] - a[1]),
    expenses: [...month.expenses].sort((a, b) => b[1] - a[1]),
  }));
}
