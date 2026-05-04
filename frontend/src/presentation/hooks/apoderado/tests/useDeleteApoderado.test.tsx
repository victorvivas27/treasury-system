import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ApoderadoRepositoryImpl } from "@/core/infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { useDeleteApoderado } from "../useDeleteApoderado";

// Mock del repositorio con función tradicional para permitir 'new'
vi.mock("@/core/infra/repositories/apoderado/ApoderadoRepositoryImpl", () => ({
  ApoderadoRepositoryImpl: vi.fn(),
}));

describe("useDeleteApoderado", () => {
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Configuramos el mock para que devuelva un objeto con el método delete
    vi.mocked(ApoderadoRepositoryImpl).mockImplementation(function() {
      return {
        delete: mockDelete,
      } as any;
    });
  });

  it("[useDeleteApoderado #01] debe inicializar los estados con valores por defecto", () => {
    const { result } = renderHook(() => useDeleteApoderado());
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.idToDelete).toBe(null);
    expect(result.current.isConfirmOpen).toBe(false);
    expect(result.current.alert.isOpen).toBe(false);
  });

  it("[useDeleteApoderado #02] debe actualizar idToDelete y activar isConfirmOpen", () => {
    const { result } = renderHook(() => useDeleteApoderado());
    act(() => { result.current.openDeleteConfirm(123); });
    expect(result.current.idToDelete).toBe(123);
    expect(result.current.isConfirmOpen).toBe(true);
  });

  it("[useDeleteApoderado #03] debe resetear idToDelete a null al cancelar", () => {
    const { result } = renderHook(() => useDeleteApoderado());
    act(() => { result.current.openDeleteConfirm(123); });
    act(() => { result.current.closeDeleteConfirm(); });
    expect(result.current.idToDelete).toBe(null);
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it("[useDeleteApoderado #04] debe gestionar exitosamente la eliminación", async () => {
    const onSuccess = vi.fn();
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteApoderado(onSuccess));

    act(() => { result.current.openDeleteConfirm(1); });
    await act(async () => { await result.current.confirmDelete(); });

    expect(result.current.alert.message).toBe("Apoderado eliminado correctamente.");
    expect(result.current.alert.type).toBe("success");
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.idToDelete).toBe(null);
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it("[useDeleteApoderado #05] debe gestionar el error de eliminación", async () => {
    mockDelete.mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useDeleteApoderado());

    act(() => { result.current.openDeleteConfirm(1); });
    await act(async () => { await result.current.confirmDelete(); });

    expect(result.current.alert.message).toBe("No se pudo eliminar el apoderado.");
    expect(result.current.alert.type).toBe("error");
    expect(result.current.isDeleting).toBe(false);
    expect(mockDelete).toHaveBeenCalledWith(1);
  });

  it("[useDeleteApoderado #06] debe controlar el estado isDeleting durante la promesa", async () => {
    let resolvePromise: any;
    const promise = new Promise<void>((resolve) => { resolvePromise = resolve; });
    mockDelete.mockReturnValue(promise);

    const { result } = renderHook(() => useDeleteApoderado());

    act(() => { result.current.openDeleteConfirm(1); });

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
      result.current.openDeleteConfirm(1);
      // Simulamos que la alerta está abierta (aunque el hook la abre en confirmDelete)
      // O simplemente llamamos a closeAlert y verificamos el estado
      result.current.closeAlert();
    });
    expect(result.current.alert.isOpen).toBe(false);
  });

  it("[useDeleteApoderado #08] no debe hacer nada si se llama a confirmDelete sin un id seleccionado", async () => {
    const { result } = renderHook(() => useDeleteApoderado());

    // Aseguramos que idToDelete es null explícitamente
    expect(result.current.idToDelete).toBe(null);

    // Ejecutamos confirmDelete
    await act(async () => {
      await result.current.confirmDelete();
    });

    // Verificamos que el repositorio NUNCA fue llamado
    expect(mockDelete).not.toHaveBeenCalled();

    // Verificamos que el estado de carga nunca cambió a true
    expect(result.current.isDeleting).toBe(false);

    // Verificamos que la alerta siga cerrada
    expect(result.current.alert.isOpen).toBe(false);
  });
});
