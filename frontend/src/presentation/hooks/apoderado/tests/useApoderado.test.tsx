import { clearPageData } from '@/presentation/hooks/useCachedPageState';
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { useApoderados } from "../useApoderados";

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
    clearPageData();
    vi.clearAllMocks();
  });


  it("[useApoderados #01] Debe manejar el error cuando el caso de uso falla.", async () => {
    const errorMessage = "Error al obtener datos";
    mockExecute.mockRejectedValue(new Error(errorMessage));
    const { result } = renderHook(() => useApoderados());
    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });
  });

  it("[useApoderados #02] Debe ejecutar refetch correctamente.", async () => {
    mockExecute.mockResolvedValue({
      ...mockPageResponse,
      content: []
    });
    const { result } = renderHook(() => useApoderados());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.apoderados).toEqual([]);
    mockExecute.mockResolvedValue(mockPageResponse);
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.apoderados).toEqual(mockPageResponse.content);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("[useApoderados #03] Debe mostrar el mensaje por defecto cuando el error no es instancia de Error.", async () => {
    mockExecute.mockRejectedValue("Un error extraño que no es clase Error");
    const { result } = renderHook(() => useApoderados());
    await waitFor(() => {
      expect(result.current.error).toBe('Error al cargar apoderados');
      expect(result.current.loading).toBe(false);
    });
  });

  it("[useApoderados #04] Debe cambiar de página correctamente.", async () => {
    const page0Response = {
      content: [{ id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "123456" }],
      page: 0,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };

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
    mockExecute.mockResolvedValue(page1Response);
    await act(async () => {
      await result.current.nextPage();
    });
    expect(result.current.apoderados).toEqual(page1Response.content);
    expect(result.current.currentPage).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenLastCalledWith(1, 3, "");
  });

  it("[useApoderados #05] Debe cambiar a página anterior correctamente.", async () => {
    const page1Response = {
      content: [{ id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "789012" }],
      page: 1,
      size: 10,
      totalElements: 15,
      totalPages: 2
    };
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
    mockExecute.mockResolvedValue(page0Response);
    await act(async () => {
      await result.current.prevPage();
    });

    expect(result.current.apoderados).toEqual(page0Response.content);
    expect(result.current.currentPage).toBe(0);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenLastCalledWith(0, 3, "");
  });

  it('reutiliza la lista al volver y permite actualizarla manualmente', async () => {
    mockExecute.mockResolvedValue(mockPageResponse);
    const first = renderHook(() => useApoderados());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useApoderados());
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.apoderados).toEqual(mockPageResponse.content);
    await waitFor(() => expect(second.result.current.refreshing).toBe(false));
    expect(mockExecute).toHaveBeenCalledTimes(1);

    await act(async () => { await second.result.current.refetch(); });
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("[useApoderados #06] No debe llamar a fetchApoderados en nextPage cuando es la última página", async () => {
    mockExecute.mockResolvedValue(mockPageResponse);
    const { result } = renderHook(() => useApoderados());
    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(false);
    });
    await act(async () => {
      await result.current.nextPage();
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

});
