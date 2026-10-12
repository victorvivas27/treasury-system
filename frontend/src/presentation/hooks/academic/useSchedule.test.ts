import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSchedule } from "./useSchedule";
const fixtures = vi.hoisted(() => ({
  account: { user: { id: 1 } }, periods: vi.fn(), read: vi.fn(), save: vi.fn(), delete: vi.fn(),
}));
vi.mock("@/presentation/context/AuthContext", () => ({ useOptionalAuth: () => fixtures.account }));
vi.mock("@/core/C-infra/repositories/academic/ScheduleRepositoryImpl", () => ({
  ScheduleRepositoryImpl: class {
    periods = fixtures.periods; read = fixtures.read; save = fixtures.save; delete = fixtures.delete;
  },
}));
const completeSchedule = { days: Array.from({ length: 5 }, (_, index) => ({
  dayOfWeek: index + 1, entryTime: "08:00", exitTime: "14:00", blocks: [],
})) };
describe("Carga del horario", () => {
  beforeEach(() => {
    vi.clearAllMocks(); fixtures.account.user.id = 1;
    fixtures.periods.mockResolvedValue([{ schoolYear: 2026, course: "Curso", editable: true }]);
    fixtures.read.mockResolvedValue({ days: [] });
  });
  it("reintenta cuando falla la carga de períodos", async () => {
    fixtures.periods.mockRejectedValueOnce(new Error("Sin conexión"));
    const hook = renderHook(() => useSchedule(false));
    await waitFor(() => expect(hook.result.current.loadFailed).toBe(true));
    act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.year).toBe(2026));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.loadFailed).toBe(false);
  });
  it("un error de guardado no bloquea la corrección del editor", async () => {
    fixtures.save.mockRejectedValueOnce({ response: { data: { errors: { schedule: "Conflicto de horario" } } } });
    const hook = renderHook(() => useSchedule(true));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await act(async () => { await hook.result.current.save({ days: [] }, false); });
    expect(hook.result.current.error).toBe("Conflicto de horario");
    expect(hook.result.current.loadFailed).toBe(false);
    expect(hook.result.current.saving).toBe(false);
  });
  it.each([
    [{ response: { data: { errors: {}, message: "Publicación rechazada" } } }, "Publicación rechazada"],
    [{ response: { status: 403, data: { errors: {} } } }, "No tienes permiso"],
    [{ code: "ERR_NETWORK" }, "No se pudo conectar"],
    [{ code: "ECONNABORTED" }, "tardó demasiado"],
  ])("explica los errores de publicación sin mensajes vacíos", async (reason, message) => {
    fixtures.save.mockRejectedValueOnce(reason);
    const hook = renderHook(() => useSchedule(true));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await act(async () => { await hook.result.current.save(completeSchedule, true); });
    expect(hook.result.current.error).toContain(message);
    expect(hook.result.current.pendingAction).toBeNull();
  });
  it("identifica la acción pendiente y la limpia al terminar", async () => {
    let finish!: (value: { days: [] }) => void;
    fixtures.save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const hook = renderHook(() => useSchedule(true));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    let result!: Promise<boolean>;
    act(() => { result = hook.result.current.save(completeSchedule, true); });
    await waitFor(() => expect(fixtures.save).toHaveBeenCalled());
    expect(hook.result.current.pendingAction).toBe("publish");
    expect(hook.result.current.saving).toBe(true);
    await act(async () => { finish({ days: [] }); await result; });
    expect(hook.result.current.pendingAction).toBeNull();
    expect(hook.result.current.message).toBe("Horario publicado.");
  });
  it("vuelve a cargar datos al cambiar de cuenta aunque tenga el mismo año", async () => {
    const hook = renderHook(() => useSchedule(false));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    const readsBefore = fixtures.read.mock.calls.length;
    fixtures.account.user.id = 2;
    hook.rerender();
    await waitFor(() => expect(fixtures.periods).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(fixtures.read.mock.calls.length).toBeGreaterThan(readsBefore));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
  });
});
