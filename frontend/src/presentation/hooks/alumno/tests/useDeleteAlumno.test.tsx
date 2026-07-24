import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteAlumno } from "../useDeleteAlumno";
import axios from "axios";

vi.mock("@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl", () => ({
  AlumnoRepositoryImpl: vi.fn(),
}));

describe("useDeleteAlumno", () => {
  const mockDelete = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AlumnoRepositoryImpl).mockImplementation(function () {
      return {
        delete: mockDelete,
      } as any;
    });
  });

  it("[useDeleteAlumno #01] Debe inicializar los estados con valores por defecto", () => {
    const { result } = renderHook(() => useDeleteAlumno());

    expect(result.current.isDeleting).toBe(false);
    expect(result.current.idToDelete).toBe(null);
    expect(result.current.isConfirmOpen).toBe(false);
    expect(result.current.alert.isOpen).toBe(false);
  });

  it("[useDeleteAlumno #02] Debe actualizar idToDelete y activar isConfirmOpen", () => {
    const { result } = renderHook(() => useDeleteAlumno());

    act(() => {
      result.current.openDeleteConfirm(123);
    });

    expect(result.current.idToDelete).toBe(123);
    expect(result.current.isConfirmOpen).toBe(true);
  });

  it("[useDeleteAlumno #03] Debe resetear idToDelete a null al cancelar", () => {
    const { result } = renderHook(() => useDeleteAlumno());

    act(() => {
      result.current.openDeleteConfirm(123);
    });
    act(() => {
      result.current.closeDeleteConfirm();
    });

    expect(result.current.idToDelete).toBe(null);
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it("[useDeleteAlumno #04] Debe gestionar exitosamente la eliminación", async () => {
    const onSuccess = vi.fn();
    mockDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteAlumno(onSuccess));

    act(() => {
      result.current.openDeleteConfirm(1);
    });
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(result.current.alert.message).toBe("Alumno eliminado correctamente.");
    expect(result.current.alert.type).toBe("success");
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.idToDelete).toBe(null);
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it("[useDeleteAlumno #05] Debe gestionar el error de eliminación", async () => {
    mockDelete.mockRejectedValue(new Error("Network Error"));
    const { result } = renderHook(() => useDeleteAlumno());

    act(() => {
      result.current.openDeleteConfirm(1);
    });
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(result.current.alert.message).toBe("No se pudo eliminar el alumno.");
    expect(result.current.alert.type).toBe("error");
    expect(result.current.isDeleting).toBe(false);
    expect(mockDelete).toHaveBeenCalledWith(1);
  });

  it("[useDeleteAlumno #06] Debe mostrar el mensaje cuando el alumno pertenece a una familia", async () => {
    const message = "No se puede eliminar el alumno porque pertenece a una familia. Primero debe desvincularlo de la familia.";
    mockDelete.mockRejectedValue({
      isAxiosError: true,
      response: { data: { errors: { familia: message } } },
    });
    vi.spyOn(axios, "isAxiosError").mockReturnValueOnce(true);
    const { result } = renderHook(() => useDeleteAlumno());

    act(() => {
      result.current.openDeleteConfirm(1);
    });
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(result.current.alert).toEqual({
      isOpen: true,
      message,
      type: "error",
    });
    expect(result.current.isDeleting).toBe(false);
  });

  it("[useDeleteAlumno #07] Debe controlar el estado isDeleting durante la promesa", async () => {
    let resolvePromise: any;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockDelete.mockReturnValue(promise);
    const { result } = renderHook(() => useDeleteAlumno());
    let deletePromise: any;

    act(() => {
      result.current.openDeleteConfirm(1);
    });
    act(() => {
      deletePromise = result.current.confirmDelete();
    });

    expect(result.current.isDeleting).toBe(true);

    await act(async () => {
      resolvePromise();
      await deletePromise;
    });

    expect(result.current.isDeleting).toBe(false);
  });

  it("[useDeleteAlumno #08] Debe cerrar la alerta correctamente", async () => {
    mockDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteAlumno());

    act(() => {
      result.current.openDeleteConfirm(1);
    });
    await act(async () => {
      await result.current.confirmDelete();
    });
    act(() => {
      result.current.closeAlert();
    });

    expect(result.current.alert.isOpen).toBe(false);
  });

  it("[useDeleteAlumno #09] No debe hacer nada si se llama a confirmDelete sin un id seleccionado", async () => {
    const { result } = renderHook(() => useDeleteAlumno());

    expect(result.current.idToDelete).toBe(null);
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(mockDelete).not.toHaveBeenCalled();
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.alert.isOpen).toBe(false);
  });
});
