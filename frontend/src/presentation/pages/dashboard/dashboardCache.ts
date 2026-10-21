import { useEffect, useSyncExternalStore } from "react";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import type { ContributionSummary } from "@/core/A-domain/entities/treasury/Treasury";
import { apiClient } from "@/core/D-config/api";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";

// Share completed and pending requests across dashboard mounts, keeping errors retryable.
export const createDashboardResource = <T,>(fetchData: () => Promise<T>) => {
  let state: { data?: T; loading: boolean; error: boolean; failure?: unknown } = { loading: false, error: false };
  let updatedAt = 0;
  let generation = 0;
  let pending: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: typeof state) => { state = next; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate() {
      const restart = state.loading && listeners.size > 0;
      generation += 1;
      pending = undefined;
      updatedAt = 0;
      publish({ ...state, loading: false });
      if (restart) queueMicrotask(() => { if (listeners.size) void this.load(); });
    },
    clear() {
      generation += 1;
      pending = undefined;
      updatedAt = 0;
      publish({ loading: false, error: false });
    },
    set(data: T) {
      generation += 1;
      pending = undefined;
      updatedAt = Date.now();
      publish({ data, loading: false, error: false });
    },
    load(force = false): Promise<void> {
      if (pending) return pending;
      if (!force && updatedAt && Date.now() - updatedAt < 60_000) return Promise.resolve();
      const requestGeneration = generation;
      publish({ ...state, loading: true, error: false, failure: undefined });
      pending = Promise.resolve().then(fetchData).then(data => {
        if (generation !== requestGeneration) return;
        updatedAt = Date.now();
        publish({ data, loading: false, error: false });
      }).catch(failure => {
        if (generation === requestGeneration) publish({ ...state, loading: false, error: true, failure });
      }).finally(() => {
        if (generation === requestGeneration) pending = undefined;
      });
      return pending;
    },
  };
};

export const useDashboardResource = <T,>(resource: ReturnType<typeof createDashboardResource<T>>, enabled = true) => {
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot);
  useEffect(() => { if (enabled) void resource.load(); }, [resource, enabled]);
  return state;
};

const repository = new TreasuryRepositoryImpl();
const students = new AlumnoRepositoryImpl();
const createYearResources = (year: number) => ({
  summary: createDashboardResource(async () => {
    const [overview, contributions] = await Promise.all([
      repository.dashboardOverview(year), repository.contributionSummary(year) as Promise<ContributionSummary>,
    ]);
    return { overview, contributions };
  }),
  profits: createDashboardResource(() => repository.eventProfits(year)),
});
const yearResources = new Map<number, ReturnType<typeof createYearResources>>();
export const getDashboardResources = (year: number) => {
  if (!yearResources.has(year)) yearResources.set(year, createYearResources(year));
  return yearResources.get(year)!;
};
export const birthdayResource = createDashboardResource(() => students.getBirthdays());
export const boardMessageResource = createDashboardResource(() => repository.getBoardMessage());
const resources = () => [birthdayResource, boardMessageResource,
  ...[...yearResources.values()].flatMap(value => [value.summary, value.profits])];
const defaultYear = () => Math.max(2026, Math.min(new Date().getFullYear(), 2035));
let selectedYear = defaultYear();
export const dashboardYear = { get: () => selectedYear, set: (year: number) => { selectedYear = year; } };
export const clearDashboardCache = () => {
  resources().forEach(resource => resource.clear());
  selectedYear = defaultYear();
};
window.addEventListener(DASHBOARD_RESET, clearDashboardCache);

// Refresh on the next visit after a successful edit that can affect the dashboard.
apiClient.interceptors.response.use(response => {
  const { method, url = "" } = response.config;
  if (["post", "put", "patch", "delete"].includes(method?.toLowerCase() ?? "")
    && /\/(tesoreria|alumnos|familias|apoderados|stands)(\/|$)/.test(url)) {
    resources().forEach(resource => resource.invalidate());
  }
  return response;
});
