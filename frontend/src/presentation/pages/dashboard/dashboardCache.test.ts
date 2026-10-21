import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { birthdayResource, clearDashboardCache, createDashboardResource, dashboardYear, getDashboardResources } from "./dashboardCache";
import { apiClient } from "@/core/D-config/api";
import { resetDashboard } from "@/shared/treasury/dashboardEvents";
import type { AxiosAdapter } from "axios";

const { getBirthdays } = vi.hoisted(() => ({ getBirthdays: vi.fn().mockResolvedValue([]) }));
vi.mock("@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl", () => ({
  AlumnoRepositoryImpl: class { getBirthdays = getBirthdays; },
}));
beforeEach(() => { clearDashboardCache(); vi.clearAllMocks(); });
afterEach(() => vi.useRealTimers());

it("comparte peticiones pendientes y reutiliza los datos al regresar", async () => {
  const fetch = vi.fn().mockResolvedValue({ total: 20 });
  const resource = createDashboardResource(fetch);
  const first = resource.load();
  expect(resource.load()).toBe(first);
  await first;
  await resource.load();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(resource.getSnapshot().data).toEqual({ total: 20 });
});

it("actualiza los datos vencidos conservando el contenido visible", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
  const fetch = vi.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(30);
  const resource = createDashboardResource(fetch);
  await resource.load();
  vi.advanceTimersByTime(60_001);
  const pending = resource.load();
  expect(resource.getSnapshot()).toMatchObject({ data: 20, loading: true });
  await pending;
  expect(resource.getSnapshot()).toMatchObject({ data: 30, loading: false });
});

it("permite reintentar los errores y no descarta los datos si falla una actualización", async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(20)
    .mockRejectedValueOnce(new Error("Offline"));
  const resource = createDashboardResource(fetch);
  await resource.load();
  expect(resource.getSnapshot()).toMatchObject({ error: true, loading: false });
  await resource.load();
  await resource.load(true);
  expect(resource.getSnapshot()).toMatchObject({ data: 20, error: true });
});

it("descarta respuestas antiguas después de invalidar o cerrar sesión", async () => {
  let finish!: (value: number) => void;
  const fetch = vi.fn().mockImplementationOnce(() => new Promise<number>(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(40);
  const resource = createDashboardResource(fetch);
  const old = resource.load();
  await Promise.resolve();
  resource.invalidate();
  await resource.load();
  finish(10);
  await old;
  expect(resource.getSnapshot().data).toBe(40);
  resource.clear();
  expect(resource.getSnapshot().data).toBeUndefined();
});

it("separa los años escolares y limpia la selección y los datos al cambiar de sesión", () => {
  expect(getDashboardResources(2026)).not.toBe(getDashboardResources(2027));
  birthdayResource.set([]);
  dashboardYear.set(2027);
  resetDashboard();
  expect(birthdayResource.getSnapshot().data).toBeUndefined();
  expect(dashboardYear.get()).toBe(new Date().getFullYear());
});

it("reinicia una carga visible si se guarda un cambio mientras la primera consulta sigue pendiente", async () => {
  let finish!: (value: number) => void;
  const fetch = vi.fn().mockImplementationOnce(() => new Promise<number>(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(40);
  const resource = createDashboardResource(fetch);
  const unsubscribe = resource.subscribe(() => undefined);
  const old = resource.load();
  await Promise.resolve();
  resource.invalidate();
  await vi.waitFor(() => expect(resource.getSnapshot().data).toBe(40));
  finish(10);
  await old;
  expect(resource.getSnapshot().data).toBe(40);
  unsubscribe();
});

it("invalida tras guardar en tesorería y conserva la caché ante lecturas u operaciones ajenas", async () => {
  const adapter: AxiosAdapter = async config =>
    ({ data: {}, status: 200, statusText: "OK", headers: {}, config });
  birthdayResource.set([]);
  await apiClient.get("/tesoreria/dashboard/overview", { adapter });
  await apiClient.post("/notifications/me/read", {}, { adapter });
  await birthdayResource.load();
  expect(getBirthdays).not.toHaveBeenCalled();
  await apiClient.post("/tesoreria/egresos", {}, { adapter });
  await birthdayResource.load();
  expect(getBirthdays).toHaveBeenCalledTimes(1);
});
