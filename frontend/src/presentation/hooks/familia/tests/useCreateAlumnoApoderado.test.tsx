import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateAlumnoApoderado } from "../useCreateFamilia";

const mockCreateUseCase = { execute: vi.fn() };

vi.mock("@/core/B-application/use-cases/familia/create/CreateAlumnoApoderadoUseCase", () => ({
  CreateAlumnoApoderadoUseCase: vi.fn().mockImplementation(function () {
    return mockCreateUseCase;
  }),
}));

vi.mock("@/core/C-infra/repositories/familia/FamiliaRepositoryImpl", () => ({
  FamiliaRepositoryImpl: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

describe("useCreateAlumnoApoderado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[useCreateAlumnoApoderado #01] Debe inicializar con estado por defecto", () => {
    const { result } = renderHook(() => useCreateAlumnoApoderado());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.fieldErrors).toEqual({});
  });

  it("[useCreateAlumnoApoderado #02] Debe crear un vínculo correctamente", async () => {
    const payload = { alumnoId: 1, apoderadoId: 2, parentesco: "Padre", principal: true };
    mockCreateUseCase.execute.mockResolvedValue({ id: 10, ...payload });
    const { result } = renderHook(() => useCreateAlumnoApoderado());

    await act(async () => {
      await result.current.create(payload);
    });

    expect(result.current.error).toBe(null);
    expect(mockCreateUseCase.execute).toHaveBeenCalledWith(payload);
  });

  it("[useCreateAlumnoApoderado #03] Debe manejar error al crear vínculo", async () => {
    const error = {
      isAxiosError: true,
      response: { data: { message: "Alumno no encontrado", errors: { alumnoId: "No existe" } } },
    };
    mockCreateUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useCreateAlumnoApoderado());

    await act(async () => {
      await expect(result.current.create({ alumnoId: 99, apoderadoId: 2, parentesco: "Padre", principal: false }))
        .rejects.toBe(error);
    });

    expect(result.current.error).toBe("Alumno no encontrado");
    expect(result.current.fieldErrors.alumnoId).toBe("No existe");
  });

  it("[useCreateAlumnoApoderado #04] Debe activar y desactivar loading durante la creación", async () => {
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockCreateUseCase.execute.mockReturnValue(promise);
    const { result } = renderHook(() => useCreateAlumnoApoderado());
    let createPromise: any;

    act(() => {
      createPromise = result.current.create({ alumnoId: 1, apoderadoId: 2, parentesco: "Padre", principal: false });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise({});
      await createPromise;
    });

    expect(result.current.loading).toBe(false);
  });
});
