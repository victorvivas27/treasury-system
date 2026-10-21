import { afterEach, beforeEach, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { apiClient } from "@/core/D-config/api";
import { clearAccessToken, clearCsrfToken } from "@/core/D-config/axiosInterceptor";
import { resetDashboard } from "@/shared/treasury/dashboardEvents";
import { clearNotificationCache, notificationCache } from "./notificationCache";

const original = apiClient.defaults.adapter;
let requests: InternalAxiosRequestConfig[];
beforeEach(() => {
  clearNotificationCache(); clearAccessToken(); clearCsrfToken(); requests = [];
  const adapter: AxiosAdapter = async config => {
    requests.push(config);
    const data = config.url?.includes("/apoderados") ? { content: [], page: 0, totalPages: 1 }
      : config.url?.endsWith("/contact") ? { id: 1, name: "Tesorería" } : [];
    return { data, config, status: 200, statusText: "OK", headers: {} };
  };
  apiClient.defaults.adapter = adapter;
});
afterEach(() => { apiClient.defaults.adapter = original; clearNotificationCache(); });

it("reuses sent messages, contacts, threads and recipient pages on return", async () => {
  const account = notificationCache(1);
  const resources = [account.sent, account.contact, account.thread(10), account.recipients(0, "")];
  await Promise.all(resources.map(resource => resource.load()));
  await Promise.all(resources.map(resource => resource.load()));
  expect(requests).toHaveLength(4);
});
it("isolates accounts, delivery IDs and recipient queries", () => {
  const a = notificationCache(1), b = notificationCache(2);
  expect(a.sent).not.toBe(b.sent);
  expect(a.contact).not.toBe(b.contact);
  expect(a.thread(10)).not.toBe(b.thread(10));
  expect(a.thread(10)).not.toBe(a.thread(11));
  expect(a.recipients(0, "")).not.toBe(a.recipients(1, ""));
  expect(a.recipients(0, "")).not.toBe(a.recipients(0, "Ana"));
});
it("invalidates sent messages and threads after a successful send or realtime event", async () => {
  const a = notificationCache(1);
  await a.sent.load(); await a.thread(10).load();
  await apiClient.post("/notifications/threads/10/messages", { message: "Hola" });
  await a.sent.load(); await a.thread(10).load();
  window.dispatchEvent(new Event("notification-realtime-received"));
  await a.sent.load(); await a.thread(10).load();
  expect(requests.filter(request => request.method === "get")).toHaveLength(6);
});
it("clears all resources at the session boundary", async () => {
  const a = notificationCache(1);
  await a.sent.load(); await a.thread(10).load();
  resetDashboard();
  expect(a.sent.getSnapshot().data).toBeUndefined();
  expect(notificationCache(1).sent).not.toBe(a.sent);
});
