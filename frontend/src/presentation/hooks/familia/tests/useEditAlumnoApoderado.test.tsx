import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditAlumnoApoderado } from "../useEditFamilia";

const mockEditUseCase = { execute: vi.fn() };

vi.mock("@/core/B-application/use-cases/familia/update/EditAlumnoApoderadoUseCase", () => ({
  EditAlumnoApoderadoUseCase: vi.fn().mockImplementation(function () {
    return mockEditUseCase;
  }),
}));

vi.mock("@/core/C-infra/repositories/familia/FamiliaRepositoryImpl", () => ({
  FamiliaRepositoryImpl: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

describe("useEditAlumnoApoderado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[useEditAlumnoApoderado #01] Debe inicializar con estado por defecto", () => {
    const { result } = renderHook(() => useEditAlumnoApoderado());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.fieldErrors).toEqual({});
  });

  it("[useEditAlumnoApoderado #02] Debe editar un vínculo correctamente", async () => {
    const payload = { parentesco: "Madre", principal: false, observaciones: "Contacto secundario" };
    mockEditUseCase.execute.mockResolvedValue({ id: 1, ...payload });
    const { result } = renderHook(() => useEditAlumnoApoderado());

    await act(async () => {
      await result.current.edit(1, payload);
    });

    expect(result.current.error).toBe(null);
    expect(mockEditUseCase.execute).toHaveBeenCalledWith(1, payload);
  });

  it("[useEditAlumnoApoderado #03] Debe manejar error al editar vínculo", async () => {
    const error = {
      isAxiosError: true,
      response: { data: { message: "Vínculo no encontrado", errors: { parentesco: "Requerido" } } },
    };
    mockEditUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useEditAlumnoApoderado());

    await act(async () => {
      await expect(result.current.edit(1, { parentesco: "", principal: false })).rejects.toBe(error);
    });

    expect(result.current.error).toBe("Vínculo no encontrado");
    expect(result.current.fieldErrors.parentesco).toBe("Requerido");
  });

  it("[useEditAlumnoApoderado #04] Debe activar y desactivar loading durante la edición", async () => {
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockEditUseCase.execute.mockReturnValue(promise);
    const { result } = renderHook(() => useEditAlumnoApoderado());
    let editPromise: any;

    act(() => {
      editPromise = result.current.edit(1, { parentesco: "Tutor", principal: true });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise({});
      await editPromise;
    });

    expect(result.current.loading).toBe(false);
  });
});
