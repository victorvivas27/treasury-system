import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { StandRepositoryImpl } from "@/core/C-infra/repositories/stand/StandRepositoryImpl";
import { StandUseCases } from "@/core/B-application/use-cases/stand/StandUseCases";
import { apiClient } from "@/core/D-config/api";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";
import { createDashboardResource } from "../dashboard/dashboardCache";
import { loadStandPanelData, type StandPanelTab } from "./standPanelData";

const treasury = new TreasuryRepositoryImpl();
const stands = new StandUseCases(new StandRepositoryImpl());
const events = new Map<string, ReturnType<typeof createEvents>>();
const lists = new Map<string, ReturnType<typeof createList>>();
const panels = new Map<string, ReturnType<typeof createPanel>>();
const createEvents = (year: number, readOnly: boolean) => createDashboardResource(async () => {
  const data = readOnly ? await treasury.listEventOptions(year) : await treasury.listEvents(year);
  return [...data].sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.id - b.id);
});
const createList = (eventId: number) => createDashboardResource(() => stands.list(eventId));
const createPanel = (standId: number, tab: StandPanelTab, readOnly: boolean) =>
  createDashboardResource(() => loadStandPanelData(stands, standId, tab, readOnly));
const selections = new Map<string, { year: number; eventId: number; standId?: number; tab: StandPanelTab }>();
export const standCache = (id: number | undefined, readOnly: boolean) => {
  const account = `${id ?? "anonymous"}:${readOnly}`;
  if (!selections.has(account)) selections.set(account, {
    year: Math.max(2026, Math.min(2035, new Date().getFullYear())), eventId: 0,
    tab: readOnly ? "summary" : "products",
  });
  return {
    selection: selections.get(account)!,
    events(year: number) {
      const key = `${account}:${year}`;
      if (!events.has(key)) events.set(key, createEvents(year, readOnly));
      return events.get(key)!;
    },
    list(eventId: number) {
      const key = `${account}:${eventId}`;
      if (!lists.has(key)) lists.set(key, createList(eventId));
      return lists.get(key)!;
    },
    panel(standId: number, tab: StandPanelTab) {
      const key = `${account}:${standId}:${tab}`;
      if (!panels.has(key)) panels.set(key, createPanel(standId, tab, readOnly));
      return panels.get(key)!;
    },
  };
};
export const readStandResource = async <T,>(resource: ReturnType<typeof createDashboardResource<T>>, force = false) => {
  await resource.load(force);
  const state = resource.getSnapshot();
  if (state.error || state.data === undefined) throw state.failure ?? new Error("No fue posible cargar el stand.");
  return state.data;
};
export const clearStandCache = () => {
  [...events.values(), ...lists.values(), ...panels.values()].forEach(resource => resource.clear());
  events.clear(); lists.clear(); panels.clear(); selections.clear();
};
window.addEventListener(DASHBOARD_RESET, clearStandCache);
apiClient.interceptors.response.use(response => {
  if (["post", "put", "patch", "delete"].includes(response.config.method?.toLowerCase() ?? "")
    && /\/tesoreria\/(stands|eventos)(\/|$)/.test(response.config.url ?? "")) {
    [...events.values(), ...lists.values(), ...panels.values()].forEach(resource => resource.invalidate());
  }
  return response;
});
