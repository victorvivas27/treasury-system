import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { AxiosAdapter } from "axios";
import { clearPublishedScheduleCache, usePublishedSchedule } from "./usePublishedSchedule";
import { apiClient } from "@/core/D-config/api";
import { resetDashboard } from "@/shared/treasury/dashboardEvents";

const fixtures = vi.hoisted(() => ({ account: { user: { id: 1 } }, periods: vi.fn(), read: vi.fn() }));
vi.mock("@/presentation/context/AuthContext", () => ({ useOptionalAuth: () => fixtures.account }));
vi.mock("@/core/C-infra/repositories/academic/ScheduleRepositoryImpl", () => ({
  ScheduleRepositoryImpl: class { periods = fixtures.periods; read = fixtures.read; },
}));
const schedule = (name = "Lenguaje") => ({ days: [{ dayOfWeek: 1, entryTime: "08:00", exitTime: "09:00",
  blocks: [{ dayOfWeek: 1, startTime: "08:00", endTime: "09:00", type: "SUBJECT", name, order: 0, color: null }] }] });
const adapter: AxiosAdapter = async config => ({ data: schedule(), status: 200, statusText: "OK", headers: {}, config });
beforeEach(() => {
  clearPublishedScheduleCache();
  vi.resetAllMocks();
  fixtures.account.user.id = 1;
  fixtures.periods.mockResolvedValue([
    { schoolYear: 2026, course: "Curso", editable: true },
    { schoolYear: 2025, course: "Curso anterior", editable: false },
  ]);
  fixtures.read.mockResolvedValue(schedule());
});

it("comparte peticiones y conserva el horario al regresar", async () => {
  const first = renderHook(() => usePublishedSchedule());
  await waitFor(() => expect(first.result.current.ready).toBe(true));
  expect(fixtures.read).toHaveBeenCalledWith(2026, false, undefined);
  first.unmount();
  const second = renderHook(() => usePublishedSchedule());
  expect(second.result.current.ready).toBe(true);
  expect(fixtures.periods).toHaveBeenCalledTimes(1);
  expect(fixtures.read).toHaveBeenCalledTimes(1);
});

it("separa los años y recuerda el seleccionado al volver", async () => {
  fixtures.read.mockImplementation((year: number) => Promise.resolve(schedule(String(year))));
  const hook = renderHook(() => usePublishedSchedule());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  act(() => hook.result.current.setYear(2025));
  expect(hook.result.current.ready).toBe(false);
  expect(hook.result.current.schedule.days).toEqual([]);
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  hook.unmount();
  const second = renderHook(() => usePublishedSchedule());
  expect(second.result.current.year).toBe(2025);
  expect(second.result.current.schedule.days[0].blocks[0].name).toBe("2025");
  act(() => second.result.current.setYear(2026));
  expect(second.result.current.schedule.days[0].blocks[0].name).toBe("2026");
  expect(fixtures.read).toHaveBeenCalledTimes(2);
});

it("no muestra datos de otra cuenta y limpia la caché al terminar la sesión", async () => {
  const hook = renderHook(() => usePublishedSchedule());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  fixtures.account.user.id = 2;
  fixtures.read.mockResolvedValue(schedule("Cuenta nueva"));
  hook.rerender();
  expect(hook.result.current.schedule.days).toEqual([]);
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  expect(hook.result.current.schedule.days[0].blocks[0].name).toBe("Cuenta nueva");
  hook.unmount();
  resetDashboard();
  const second = renderHook(() => usePublishedSchedule());
  expect(second.result.current.ready).toBe(false);
  await waitFor(() => expect(second.result.current.ready).toBe(true));
  expect(fixtures.read).toHaveBeenCalledTimes(3);
});

it("permite reintentar si falla la lista de años o la consulta del horario", async () => {
  fixtures.periods.mockRejectedValueOnce(new Error("Offline"));
  fixtures.read.mockRejectedValueOnce(new Error("Offline"));
  const hook = renderHook(() => usePublishedSchedule());
  await waitFor(() => expect(hook.result.current.error).toContain("años escolares"));
  act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.error).toContain("horario publicado"));
  act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
});

it("termina la preparación sin pedir un horario si no existen años escolares", async () => {
  fixtures.periods.mockResolvedValue([]);
  const hook = renderHook(() => usePublishedSchedule());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  expect(hook.result.current.schedule.days).toEqual([]);
  expect(fixtures.read).not.toHaveBeenCalled();
});

it("actualiza la consulta después de publicar y conserva la última publicación al guardar un borrador", async () => {
  const hook = renderHook(() => usePublishedSchedule());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  hook.unmount();
  await apiClient.put("/academic/schedules/2026", schedule("Borrador"), { params: { publish: false }, adapter });
  const second = renderHook(() => usePublishedSchedule());
  expect(second.result.current.schedule.days[0].blocks[0].name).toBe("Lenguaje");
  expect(fixtures.read).toHaveBeenCalledTimes(1);
  second.unmount();
  fixtures.read.mockResolvedValue(schedule("Horario publicado actualizado"));
  await apiClient.put("/academic/schedules/2026", schedule(), { params: { publish: true }, adapter });
  const third = renderHook(() => usePublishedSchedule());
  expect(third.result.current.ready).toBe(true);
  await waitFor(() => expect(third.result.current.schedule.days[0].blocks[0].name).toBe("Horario publicado actualizado"));
  expect(fixtures.read).toHaveBeenCalledTimes(2);
});
