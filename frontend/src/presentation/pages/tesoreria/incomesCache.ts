import type { IncomeFilters, TreasuryIncome } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { apiClient } from "@/core/D-config/api";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";
import { createDashboardResource } from "../dashboard/dashboardCache";

const repository = new TreasuryRepositoryImpl();
const createIncomes = (year: number, filters: IncomeFilters) => createDashboardResource(async () => {
  const [items, overview] = await Promise.all([
    repository.listIncomes(year, filters) as Promise<TreasuryIncome[]>, repository.dashboardOverview(year),
  ]);
  return { items, overview };
});
const incomes = new Map<string, ReturnType<typeof createIncomes>>();
const courses = new Map<string, ReturnType<typeof createDashboardResource<string>>>();
type Selection = { year: number; view: "ALL" | "FEES" | "OTHER"; filters: IncomeFilters };
const selections = new Map<string, Selection>();
const accountKey = (id: number | undefined, admin: boolean) => `${id ?? "anonymous"}:${admin}`;
export const incomesSelection = (id: number | undefined, admin: boolean) => {
  const key = accountKey(id, admin);
  if (!selections.has(key)) selections.set(key, { year: 2026, view: "ALL", filters: { status: "ACTIVE", sort: "DATE_DESC" } });
  return selections.get(key)!;
};
export const getIncomesResources = (id: number | undefined, admin: boolean, year: number, filters: IncomeFilters) => {
  const account = accountKey(id, admin);
  const key = JSON.stringify([account, year, Object.entries(filters).filter(([, value]) => value !== undefined && value !== "").sort(([a], [b]) => a.localeCompare(b))]);
  if (!incomes.has(key)) incomes.set(key, createIncomes(year, { ...filters }));
  if (!courses.has(account)) courses.set(account, createDashboardResource(() => repository.getManagedCourse()));
  return { incomes: incomes.get(key)!, course: courses.get(account)! };
};
export const clearIncomesCache = () => {
  incomes.forEach(resource => resource.clear());
  courses.forEach(resource => resource.clear());
  incomes.clear(); courses.clear(); selections.clear();
};
window.addEventListener(DASHBOARD_RESET, clearIncomesCache);
apiClient.interceptors.response.use(response => {
  if (["post", "put", "patch", "delete"].includes(response.config.method?.toLowerCase() ?? "")
    && /\/(tesoreria|eventos|stands|familias|alumnos|apoderados)(\/|$)/.test(response.config.url ?? "")) {
    incomes.forEach(resource => resource.invalidate());
    courses.forEach(resource => resource.invalidate());
  }
  return response;
});
