import { afterEach, beforeEach, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { apiClient } from "@/core/D-config/api";
import { clearAccessToken, clearCsrfToken } from "@/core/D-config/axiosInterceptor";
import { resetDashboard } from "@/shared/treasury/dashboardEvents";
import { clearStandCache, standCache, readStandResource } from "./standCache";

const originalAdapter = apiClient.defaults.adapter;
let requests: InternalAxiosRequestConfig[];
let total: number;
beforeEach(() => {
  clearStandCache(); clearAccessToken(); clearCsrfToken(); requests = []; total = 1000;
  const adapter: AxiosAdapter = async config => {
    requests.push(config);
    const data = config.url?.endsWith("/resumen") ? { totalSold: total }
      : config.url?.endsWith("/stands") ? [{ id: 10, eventId: 1 }]
      : config.url?.includes("/eventos") ? [{ id: 1, name: "Fiesta", eventDate: "2026-10-21" }] : [];
    return { data, config, status: 200, statusText: "OK", headers: {} };
  };
  apiClient.defaults.adapter = adapter;
});
afterEach(() => { apiClient.defaults.adapter = originalAdapter; clearStandCache(); });

it("shares pending reads and reuses events, stand list and summary", async () => {
  const cache = standCache(1, true);
  const first = cache.events(2026).load();
  expect(cache.events(2026).load()).toBe(first);
  await first;
  await readStandResource(cache.list(1));
  await readStandResource(cache.panel(10, "summary"));
  await readStandResource(standCache(1, true).events(2026));
  await readStandResource(cache.list(1));
  await readStandResource(cache.panel(10, "summary"));
  expect(requests).toHaveLength(3);
  expect(requests[0].url).toBe("/tesoreria/eventos/consulta");
});

it("separates account, role, year, event, stand and panel", () => {
  const a = standCache(1, false);
  expect(a.events(2026)).not.toBe(a.events(2027));
  expect(a.events(2026)).not.toBe(standCache(2, false).events(2026));
  expect(a.events(2026)).not.toBe(standCache(1, true).events(2026));
  expect(a.list(1)).not.toBe(a.list(2));
  expect(a.panel(10, "summary")).not.toBe(a.panel(11, "summary"));
  expect(a.panel(10, "summary")).not.toBe(a.panel(10, "sales"));
});

it("refreshes the summary after a sale succeeds", async () => {
  const resource = standCache(1, true).panel(10, "summary");
  await readStandResource(resource);
  total = 2000;
  await apiClient.post("/tesoreria/stands/10/ventas", {});
  await readStandResource(resource);
  expect(resource.getSnapshot().data?.summary?.totalSold).toBe(2000);
  expect(requests.filter(request => request.url?.endsWith("/resumen"))).toHaveLength(2);
});

it("clears data and saved selection on session reset", async () => {
  const cache = standCache(1, true);
  const resource = cache.events(2026);
  await readStandResource(resource);
  cache.selection.eventId = 5;
  resetDashboard();
  expect(resource.getSnapshot().data).toBeUndefined();
  expect(standCache(1, true).selection.eventId).toBe(0);
  expect(standCache(1, true).events(2026)).not.toBe(resource);
});
