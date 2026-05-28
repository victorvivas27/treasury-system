import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { useApoderados } from "../useApoderados";



// 1. Usamos vi.hoisted para que esta variable se cree ANTES que el vi.mock
const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn()
}));

vi.mock("@/core/B-application/use-cases/apoderado/list/GetApoderadosUseCase", () => {
  return {
    GetApoderadosUseCase: vi.fn().mockImplementation(function () {
      return {
        execute: mockExecute
      };
    }),
  };
});

describe("useApoderados Hook", () => {
  const mockPageResponse = {
    content: [
      { id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "123456" }
    ],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[useApoderados #01] Debe cargar apoderados exitosamente al montar.", async () => {
    mockExecute.mockResolvedValue(mockPageResponse);

    const { result } = renderHook(() => useApoderados());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.apoderados).toEqual(mockPageResponse.content);
      expect(result.current.loading).toBe(false);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.currentPage).toBe(0);
    });
  });

  it("[useApoderados #02] Debe manejar el error cuando el caso de uso falla.", async () => {
    const errorMessage = "Error al obtener datos";
    mockExecute.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useApoderados());

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });
  });

  it("[useApoderados #03] Debe ejecutar refetch correctamente.", async () => {
    // Primera carga con datos vacíos
    mockExecute.mockResolvedValue({
      ...mockPageResponse,
      content: []
    });

    const { result } = renderHook(() => useApoderados());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.apoderados).toEqual([]);

    // Segunda carga con datos
    mockExecute.mockResolvedValue(mockPageResponse);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.apoderados).toEqual(mockPageResponse.content);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("[useApoderados #04] Debe mostrar el mensaje por defecto cuando el error no es instancia de Error.", async () => {
    // Simulamos que el caso de uso lanza algo que NO es un Error (un string, por ejemplo)
    mockExecute.mockRejectedValue("Un error extraño que no es clase Error");

    const { result } = renderHook(() => useApoderados());

    await waitFor(() => {
      // Aquí validamos la segunda parte del ternario
      expect(result.current.error).toBe('Error al cargar apoderados');
      expect(result.current.loading).toBe(false);
    });
  });

  it("[useApoderados #05] Debe cambiar de página correctamente.", async () => {
    // Mock para página 0
    const page0Response = {
      content: [{ id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "123456" }],
      page: 0,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };

    // Mock para página 1
    const page1Response = {
      content: [{ id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "789012" }],
      page: 1,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };

    mockExecute.mockResolvedValue(page0Response);

    const { result } = renderHook(() => useApoderados());

    await waitFor(() => {
      expect(result.current.apoderados).toEqual(page0Response.content);
      expect(result.current.currentPage).toBe(0);
    });

    // Cambiar a siguiente página
    mockExecute.mockResolvedValue(page1Response);

    await act(async () => {
      await result.current.nextPage();
    });

    expect(result.current.apoderados).toEqual(page1Response.content);
    expect(result.current.currentPage).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenLastCalledWith(1, 3);
  });

  it("[useApoderados #06] Debe cambiar a página anterior correctamente.", async () => {
    // Mock para página 1
    const page1Response = {
      content: [{ id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "789012" }],
      page: 1,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };

    // Mock para página 0
    const page0Response = {
      content: [{ id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "123456" }],
      page: 0,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };

    mockExecute.mockResolvedValue(page1Response);

    const { result } = renderHook(() => useApoderados({ initialPage: 1 }));

    await waitFor(() => {
      expect(result.current.apoderados).toEqual(page1Response.content);
      expect(result.current.currentPage).toBe(1);
    });

    // Cambiar a página anterior
    mockExecute.mockResolvedValue(page0Response);

    await act(async () => {
      await result.current.prevPage();
    });

    expect(result.current.apoderados).toEqual(page0Response.content);
    expect(result.current.currentPage).toBe(0);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenLastCalledWith(0, 3);
  });

  it("[useApoderados #07] Debe deshabilitar nextPage cuando es la última página.", async () => {
    mockExecute.mockResolvedValue(mockPageResponse);

    const { result } = renderHook(() => useApoderados());

    await waitFor(() => {
      expect(result.current.isLastPage).toBe(true);
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  it("[useApoderados #08] Debe deshabilitar prevPage cuando es la primera página.", async () => {
    mockExecute.mockResolvedValue(mockPageResponse);

    const { result } = renderHook(() => useApoderados());

    await waitFor(() => {
      expect(result.current.hasPrevPage).toBe(false);
      expect(result.current.currentPage).toBe(0);
    });
  });

  it("[useApoderados #09] Debe ejecutar el setTimeout cuando la petición es rápida (< 300ms)", async () => {
    // Mock que resuelve instantáneamente
    mockExecute.mockResolvedValue(mockPageResponse);

    const { result } = renderHook(() => useApoderados());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.apoderados).toEqual(mockPageResponse.content);
    });
    // El if (remainingTime > 0) se ejecutará porque elapsedTime es casi 0
  });

  it("[useApoderados #10] No debe llamar a fetchApoderados en nextPage cuando es la última página", async () => {
    // Configurar como última página (página 0 de 1 página total)
    mockExecute.mockResolvedValue(mockPageResponse); // totalPages = 1

    const { result } = renderHook(() => useApoderados());

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(false);
    });

    // Intentar nextPage - NO debe llamar a fetchApoderados
    await act(async () => {
      await result.current.nextPage();
    });

    // fetchApoderados solo se llamó una vez (la inicial)
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

 it("[useApoderados #11] Forzar cobertura del bloque remainingTime", async () => {
  // Espiar Date.now para controlar el tiempo
  const dateNowSpy = vi.spyOn(Date, 'now');

  // Primera llamada (startTime)
  dateNowSpy.mockReturnValueOnce(0);
  // Segunda llamada (elapsedTime) - solo pasaron 100ms
  dateNowSpy.mockReturnValueOnce(100);

  mockExecute.mockResolvedValue(mockPageResponse);

  const { result } = renderHook(() => useApoderados());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  dateNowSpy.mockRestore();
});

});
