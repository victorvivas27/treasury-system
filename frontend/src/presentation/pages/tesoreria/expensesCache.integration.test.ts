import { afterEach, beforeEach, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { apiClient } from "@/core/D-config/api";
import { clearAccessToken, clearCsrfToken } from "@/core/D-config/axiosInterceptor";
import { resetDashboard } from "@/shared/treasury/dashboardEvents";
import { clearExpensesCache, getExpensesResource, expensesSelection } from "./expensesCache";

const adapter = apiClient.defaults.adapter;
let requests: InternalAxiosRequestConfig[];
let records: { id: number; description: string }[];
beforeEach(() => {
  clearExpensesCache(); clearAccessToken(); clearCsrfToken(); requests = [];
  records = [{ id: 1, description: "Materiales" }];
  const transport: AxiosAdapter = async config => {
    requests.push(config);
    const data = config.url?.endsWith("/egresos") ? [...records]
      : { schoolYear: 2026, totalIncome: 150000, totalExpenses: 15000, availableBalance: 135000 };
    return { data, config, status: 200, statusText: "OK", headers: {} };
  };
  apiClient.defaults.adapter = transport;
});
afterEach(() => { apiClient.defaults.adapter = adapter; clearExpensesCache(); });

it("deduplicates pending reads and reuses completed data", async () => {
  const resource = getExpensesResource(1, true, 2026, {});
  const pending = resource.load();
  expect(resource.load()).toBe(pending);
  await pending;
  await getExpensesResource(1, true, 2026, {}).load();
  expect(requests).toHaveLength(2);
  expect(resource.getSnapshot().data?.items[0].description).toBe("Materiales");
});

it("isolates accounts, roles, years and filters while normalizing filter order", () => {
  const get = getExpensesResource;
  const first = get(1, true, 2026, { search: "rifa", status: "ACTIVE" });
  expect(get(1, true, 2026, { status: "ACTIVE", search: "rifa" })).toBe(first);
  expect(new Set([first, get(2, true, 2026, {}), get(1, false, 2026, {}),
    get(1, true, 2027, {}), get(1, true, 2026, {})]).size).toBe(5);
});

it("invalidates the summary and filtered lists after a successful expense or payment edit", async () => {
  const resource = getExpensesResource(1, true, 2026, {});
  await resource.load();
  records.push({ id: 2, description: "Compra nueva" });
  await apiClient.patch("/tesoreria/egresos/1", {});
  await resource.load();
  expect(resource.getSnapshot().data?.items).toHaveLength(2);
  await apiClient.post("/tesoreria/pagos-transferencia/2/aprobar", {});
  await resource.load();
  expect(requests.filter(request => request.url?.endsWith("/resumen-financiero"))).toHaveLength(3);
});

it("clears data and saved selections at the session boundary", async () => {
  const resource = getExpensesResource(1, true, 2026, {});
  await resource.load();
  expensesSelection(1, true).year = 2027;
  resetDashboard();
  expect(resource.getSnapshot().data).toBeUndefined();
  expect(expensesSelection(1, true).year).toBe(2026);
  expect(getExpensesResource(1, true, 2026, {})).not.toBe(resource);
});
