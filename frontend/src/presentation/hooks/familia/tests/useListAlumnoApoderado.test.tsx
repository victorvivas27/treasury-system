import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useListAlumnoApoderado } from "../useListFamilia";

const mockListUseCase = { execute: vi.fn() };

vi.mock("@/core/B-application/use-cases/familia/list/ListAlumnoApoderadoUseCase", () => ({
  ListAlumnoApoderadoUseCase: vi.fn().mockImplementation(function () {
    return mockListUseCase;
  }),
}));

vi.mock("@/core/C-infra/repositories/familia/FamiliaRepositoryImpl", () => ({
  FamiliaRepositoryImpl: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

describe("useListAlumnoApoderado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListUseCase.execute.mockResolvedValue({
      content: [],
      page: 0,
      size: 5,
      totalElements: 0,
      totalPages: 0,
    });
  });

  it("[useListAlumnoApoderado #01] Debe inicializar y listar vínculos", async () => {
    const vinculo = {
      id: 1,
      alumnoId: 2,
      alumnoCodigo: "AL-1",
      alumnoNombre: "Juan",
      alumnoCurso: "4A",
      apoderadoId: 3,
      apoderadoCodigo: "AP-1",
      apoderadoNombre: "Victor",
      parentesco: "Padre",
      principal: true,
    };
    mockListUseCase.execute.mockResolvedValue({
      content: [vinculo],
      page: 0,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    });

    const { result } = renderHook(() => useListAlumnoApoderado());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.vinculos).toEqual([vinculo]);
    expect(mockListUseCase.execute).toHaveBeenCalledWith(0, 5, "");
  });

  it("[useListAlumnoApoderado #02] Debe manejar error al listar vínculos", async () => {
    mockListUseCase.execute.mockRejectedValue(new Error("Error al listar"));

    const { result } = renderHook(() => useListAlumnoApoderado());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Error al listar");
  });

  it("[useListAlumnoApoderado #03] Debe solicitar la página siguiente", async () => {
    mockListUseCase.execute.mockResolvedValue({
      content: [],
      page: 0,
      size: 5,
      totalElements: 10,
      totalPages: 2,
    });
    const { result } = renderHook(() => useListAlumnoApoderado());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.nextPage();
    });

    expect(mockListUseCase.execute).toHaveBeenLastCalledWith(1, 5, "");
  });
});
