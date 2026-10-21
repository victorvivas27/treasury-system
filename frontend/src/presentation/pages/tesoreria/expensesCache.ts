import type { ExpenseFilters, FinancialSummary, TreasuryExpense } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { apiClient } from "@/core/D-config/api";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";
import { createDashboardResource } from "../dashboard/dashboardCache";

const repository = new TreasuryRepositoryImpl();
const createExpenses = (year: number, filters: ExpenseFilters) => createDashboardResource(async () => {
  const [items, summary] = await Promise.all([
    repository.listExpenses(year, filters) as Promise<TreasuryExpense[]>,
    repository.financialSummary(year) as Promise<FinancialSummary>,
  ]);
  return { items, summary };
});
const resources = new Map<string, ReturnType<typeof createExpenses>>();
const selections = new Map<string, { year: number; filters: ExpenseFilters }>();
const accountKey = (id: number | undefined, admin: boolean) => `${id ?? "anonymous"}:${admin}`;
export const expensesSelection = (id: number | undefined, admin: boolean) => {
  const key = accountKey(id, admin);
  if (!selections.has(key)) selections.set(key, { year: 2026, filters: { status: "ACTIVE", sort: "DATE_DESC" } });
  return selections.get(key)!;
};
export const getExpensesResource = (id: number | undefined, admin: boolean, year: number, filters: ExpenseFilters) => {
  const key = JSON.stringify([accountKey(id, admin), year, Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== "").sort(([a], [b]) => a.localeCompare(b))]);
  if (!resources.has(key)) resources.set(key, createExpenses(year, { ...filters }));
  return resources.get(key)!;
};
export const clearExpensesCache = () => {
  resources.forEach(resource => resource.clear());
  resources.clear(); selections.clear();
};
window.addEventListener(DASHBOARD_RESET, clearExpensesCache);
apiClient.interceptors.response.use(response => {
  if (["post", "put", "patch", "delete"].includes(response.config.method?.toLowerCase() ?? "")
    && /\/(tesoreria|eventos|stands|familias|alumnos|apoderados)(\/|$)/.test(response.config.url ?? "")) {
    resources.forEach(resource => resource.invalidate());
  }
  return response;
});
