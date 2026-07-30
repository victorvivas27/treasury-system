import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDeleteApoderado } from "../useDeleteApoderado";

vi.mock("@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl", () => ({
  ApoderadoRepositoryImpl: vi.fn(),
}));

describe("useDeleteApoderado", () => {
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ApoderadoRepositoryImpl).mockImplementation(function () {
      return {
        delete: mockDelete,
      } as any;
    });
  });

  it("[useDeleteApoderado #01] debe inicializar los estados con valores por defecto", () => {
    const { result } = renderHook(() => useDeleteApoderado());
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.codigoToDelete).toBe(null);
    expect(result.current.isConfirmOpen).toBe(false);
    expect(result.current.alert.isOpen).toBe(false);
  });

  it("[useDeleteApoderado #02] debe actualizar idToDelete y activar isConfirmOpen", () => {
    const { result } = renderHook(() => useDeleteApoderado());
    act(() => { result.current.openDeleteConfirm("AP-ABC12345"); });
    expect(result.current.codigoToDelete).toBe("AP-ABC12345");
    expect(result.current.isConfirmOpen).toBe(true);
  });

  it("[useDeleteApoderado #03] debe resetear idToDelete a null al cancelar", () => {
    const { result } = renderHook(() => useDeleteApoderado());
    act(() => { result.current.openDeleteConfirm("AP-ABC12345"); });
    act(() => { result.current.closeDeleteConfirm(); });
    expect(result.current.codigoToDelete).toBe(null);
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it("[useDeleteApoderado #04] debe gestionar exitosamente la eliminación", async () => {
    const onSuccess = vi.fn();
    mockDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteApoderado(onSuccess));
    act(() => { result.current.openDeleteConfirm("AP-ABC12345"); });
    await act(async () => { await result.current.confirmDelete(); });
    expect(result.current.alert.message).toBe("Apoderado eliminado correctamente.");
    expect(result.current.alert.type).toBe("success");
    expect(onSuccess).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith("AP-ABC12345");
    expect(result.current.codigoToDelete).toBe(null);
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it("[useDeleteApoderado #05] debe gestionar el error de eliminación", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDelete.mockRejectedValue(new Error("Network Error"));
    const { result } = renderHook(() => useDeleteApoderado());
    act(() => { result.current.openDeleteConfirm("AP-ABC12345"); });
    await act(async () => { await result.current.confirmDelete(); });
    expect(result.current.alert.message).toBe("No se pudo eliminar el apoderado.");
    expect(result.current.alert.type).toBe("error");
    expect(result.current.isDeleting).toBe(false);
    expect(mockDelete).toHaveBeenCalledWith("AP-ABC12345");
    consoleErrorSpy.mockRestore();
  });

  it("[useDeleteApoderado #06] debe controlar el estado isDeleting durante la promesa", async () => {
    let resolvePromise: any;
    const promise = new Promise<void>((resolve) => { resolvePromise = resolve; });
    mockDelete.mockReturnValue(promise);
    const { result } = renderHook(() => useDeleteApoderado());
    act(() => { result.current.openDeleteConfirm("AP-ABC12345"); });
    let deletePromise: any;
    act(() => { deletePromise = result.current.confirmDelete(); });
    expect(result.current.isDeleting).toBe(true);
    await act(async () => {
      resolvePromise();
      await deletePromise;
    });
    expect(result.current.isDeleting).toBe(false);
  });

  it("[useDeleteApoderado #07] debe cerrar la alerta correctamente", () => {
    const { result } = renderHook(() => useDeleteApoderado());
    act(() => {
      result.current.openDeleteConfirm("AP-ABC12345");
      result.current.closeAlert();
    });
    expect(result.current.alert.isOpen).toBe(false);
  });

  it("[useDeleteApoderado #08] no debe hacer nada si se llama a confirmDelete sin un id seleccionado", async () => {
    const { result } = renderHook(() => useDeleteApoderado());
    expect(result.current.codigoToDelete).toBe(null);
    await act(async () => {
      await result.current.confirmDelete();
    });
    expect(mockDelete).not.toHaveBeenCalled();
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.alert.isOpen).toBe(false);
  });
});
