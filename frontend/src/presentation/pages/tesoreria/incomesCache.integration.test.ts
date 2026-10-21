import { afterEach, beforeEach, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { apiClient } from "@/core/D-config/api";
import { clearAccessToken, clearCsrfToken } from "@/core/D-config/axiosInterceptor";
import { resetDashboard } from "@/shared/treasury/dashboardEvents";
import { clearIncomesCache, getIncomesResources, incomesSelection } from "./incomesCache";

const adapter = apiClient.defaults.adapter;
let requests: InternalAxiosRequestConfig[];
let records: { id: number; description: string }[];
beforeEach(() => {
  clearIncomesCache(); clearAccessToken(); clearCsrfToken(); requests = [];
  records = [{ id: 1, description: "Rifa" }];
  const transport: AxiosAdapter = async config => {
    requests.push(config);
    const data = config.url?.endsWith("/ingresos") ? [...records]
      : config.url?.endsWith("/curso") ? { course: "1A" } : { finances: {}, recentMovements: [] };
    return { data, config, status: 200, statusText: "OK", headers: {} };
  };
  apiClient.defaults.adapter = transport;
});
afterEach(() => { apiClient.defaults.adapter = adapter; clearIncomesCache(); });

it("deduplicates pending reads and reuses completed data", async () => {
  const resource = getIncomesResources(1, true, 2026, {}).incomes;
  const pending = resource.load();
  expect(resource.load()).toBe(pending);
  await pending;
  await getIncomesResources(1, true, 2026, {}).incomes.load();
  expect(requests).toHaveLength(2);
  expect(resource.getSnapshot().data?.items[0].description).toBe("Rifa");
});

it("isolates accounts, roles, years and filters while normalizing filter order", () => {
  const get = getIncomesResources;
  const first = get(1, true, 2026, { search: "rifa", status: "ACTIVE" }).incomes;
  expect(get(1, true, 2026, { status: "ACTIVE", search: "rifa" }).incomes).toBe(first);
  expect(new Set([first, get(2, true, 2026, {}).incomes, get(1, false, 2026, {}).incomes,
    get(1, true, 2027, {}).incomes, get(1, true, 2026, {}).incomes]).size).toBe(5);
});

it("invalidates the summary and filtered lists after a successful payment or income edit", async () => {
  const resource = getIncomesResources(1, true, 2026, {}).incomes;
  await resource.load();
  records.push({ id: 2, description: "Donación" });
  await apiClient.patch("/tesoreria/ingresos/1", {});
  await resource.load();
  expect(resource.getSnapshot().data?.items).toHaveLength(2);
  await apiClient.post("/tesoreria/pagos-transferencia/2/aprobar", {});
  await resource.load();
  expect(requests.filter(request => request.url?.endsWith("/dashboard/overview"))).toHaveLength(3);
});

it("clears data and saved selections at the session boundary", async () => {
  const resource = getIncomesResources(1, true, 2026, {}).incomes;
  await resource.load();
  incomesSelection(1, true).year = 2027;
  resetDashboard();
  expect(resource.getSnapshot().data).toBeUndefined();
  expect(incomesSelection(1, true).year).toBe(2026);
  expect(getIncomesResources(1, true, 2026, {}).incomes).not.toBe(resource);
});
