import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { useAlumnos } from "../useAlumnos";

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn()
}));

vi.mock("@/core/B-application/use-cases/alumno/list/GetAlumnosUseCase", () => {
  return {
    GetAlumnosUseCase: vi.fn().mockImplementation(function () {
      return {
        execute: mockExecute
      };
    }),
  };
});

describe("useAlumnos Hook", () => {
  const mockPageResponse = {
    content: [
      { id: 1, nombre: "Juan Pérez", curso: "4A", apoderadoId: 1 }
    ],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[useAlumnos #01] Debe cargar alumnos exitosamente al montar.", async () => {
    mockExecute.mockResolvedValue(mockPageResponse);
    const { result } = renderHook(() => useAlumnos());
    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.alumnos).toEqual(mockPageResponse.content);
      expect(result.current.loading).toBe(false);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.currentPage).toBe(0);
    });
  });

  it("[useAlumnos #02] Debe manejar el error cuando el caso de uso falla.", async () => {
    const errorMessage = "Error al obtener datos";
    mockExecute.mockRejectedValue(new Error(errorMessage));
    const { result } = renderHook(() => useAlumnos());
    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });
  });

  it("[useAlumnos #03] Debe ejecutar refetch correctamente.", async () => {
    mockExecute.mockResolvedValue({
      ...mockPageResponse,
      content: []
    });
    const { result } = renderHook(() => useAlumnos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.alumnos).toEqual([]);
    mockExecute.mockResolvedValue(mockPageResponse);
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.alumnos).toEqual(mockPageResponse.content);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("[useAlumnos #04] Debe mostrar el mensaje por defecto cuando el error no es instancia de Error.", async () => {
    mockExecute.mockRejectedValue("Un error extraño que no es clase Error");
    const { result } = renderHook(() => useAlumnos());
    await waitFor(() => {
      expect(result.current.error).toBe('Error al cargar alumnos');
      expect(result.current.loading).toBe(false);
    });
  });

  it("[useAlumnos #05] Debe cambiar de página correctamente.", async () => {
    const page0Response = {
      content: [{ id: 1, nombre: "Juan Pérez", curso: "4A", apoderadoId: 1 }],
      page: 0,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };
    const page1Response = {
      content: [{ id: 2, nombre: "Maria Lopez", curso: "4B", apoderadoId: 2 }],
      page: 1,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };
    mockExecute.mockResolvedValue(page0Response);
    const { result } = renderHook(() => useAlumnos());
    await waitFor(() => {
      expect(result.current.alumnos).toEqual(page0Response.content);
      expect(result.current.currentPage).toBe(0);
    });
    mockExecute.mockResolvedValue(page1Response);
    await act(async () => {
      await result.current.nextPage();
    });
    expect(result.current.alumnos).toEqual(page1Response.content);
    expect(result.current.currentPage).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenLastCalledWith(1, 3);
  });

  it("[useAlumnos #06] Debe cambiar a página anterior correctamente.", async () => {
    const page1Response = {
      content: [{ id: 2, nombre: "Maria Lopez", curso: "4B", apoderadoId: 2 }],
      page: 1,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };

    const page0Response = {
      content: [{ id: 1, nombre: "Juan Pérez", curso: "4A", apoderadoId: 1 }],
      page: 0,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };
    mockExecute.mockResolvedValue(page1Response);
    const { result } = renderHook(() => useAlumnos({ initialPage: 1 }));
    await waitFor(() => {
      expect(result.current.alumnos).toEqual(page1Response.content);
      expect(result.current.currentPage).toBe(1);
    });
    mockExecute.mockResolvedValue(page0Response);
    await act(async () => {
      await result.current.prevPage();
    });
    expect(result.current.alumnos).toEqual(page0Response.content);
    expect(result.current.currentPage).toBe(0);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenLastCalledWith(0, 3);
  });

  it("[useAlumnos #07] Debe deshabilitar nextPage cuando es la última página.", async () => {
    mockExecute.mockResolvedValue(mockPageResponse);
    const { result } = renderHook(() => useAlumnos());
    await waitFor(() => {
      expect(result.current.isLastPage).toBe(true);
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  it("[useAlumnos #08] Debe deshabilitar prevPage cuando es la primera página.", async () => {
    mockExecute.mockResolvedValue(mockPageResponse);
    const { result } = renderHook(() => useAlumnos());
    await waitFor(() => {
      expect(result.current.hasPrevPage).toBe(false);
      expect(result.current.currentPage).toBe(0);
    });
  });

  it("[useAlumnos #09] No debe llamar a fetchAlumnos en nextPage cuando es la última página", async () => {
    mockExecute.mockResolvedValue(mockPageResponse);
    const { result } = renderHook(() => useAlumnos());
    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(false);
    });
    await act(async () => {
      await result.current.nextPage();
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

});
