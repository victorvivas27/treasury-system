import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteAlumnoApoderado } from "../useDeleteFamilia";

const mockDeleteUseCase = { execute: vi.fn() };

vi.mock("@/core/B-application/use-cases/familia/delete/DeleteAlumnoApoderadoUseCase", () => ({
  DeleteAlumnoApoderadoUseCase: vi.fn().mockImplementation(function () {
    return mockDeleteUseCase;
  }),
}));

vi.mock("@/core/C-infra/repositories/familia/FamiliaRepositoryImpl", () => ({
  FamiliaRepositoryImpl: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

describe("useDeleteAlumnoApoderado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[useDeleteAlumnoApoderado #01] Debe inicializar con estado por defecto", () => {
    const { result } = renderHook(() => useDeleteAlumnoApoderado());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("[useDeleteAlumnoApoderado #02] Debe eliminar un vínculo correctamente", async () => {
    mockDeleteUseCase.execute.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteAlumnoApoderado());

    await act(async () => {
      await result.current.remove(7);
    });

    expect(result.current.error).toBe(null);
    expect(mockDeleteUseCase.execute).toHaveBeenCalledWith(7);
  });

  it("[useDeleteAlumnoApoderado #03] Debe manejar error al eliminar vínculo", async () => {
    const error = new Error("No encontrado");
    mockDeleteUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useDeleteAlumnoApoderado());

    await act(async () => {
      await expect(result.current.remove(7)).rejects.toBe(error);
    });

    expect(result.current.error).toBe("No encontrado");
  });

  it("[useDeleteAlumnoApoderado #04] Debe activar y desactivar loading durante la eliminación", async () => {
    let resolvePromise: any;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockDeleteUseCase.execute.mockReturnValue(promise);
    const { result } = renderHook(() => useDeleteAlumnoApoderado());
    let deletePromise: any;

    act(() => {
      deletePromise = result.current.remove(7);
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise();
      await deletePromise;
    });

    expect(result.current.loading).toBe(false);
  });
});
