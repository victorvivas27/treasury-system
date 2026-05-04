;
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act } from "react";
import { useApoderados } from "../useApoderados";



// 1. Usamos vi.hoisted para que esta variable se cree ANTES que el vi.mock
const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn()
}));

vi.mock("@/core/application/use-cases/apoderado/GetApoderadosUseCase", () => {
  return {
    // Usamos una función tradicional para evitar el error de constructor
    GetApoderadosUseCase: vi.fn().mockImplementation(function() {
      return {
        // Accedemos a la variable que definimos arriba
        execute: mockExecute
      };
    }),
  };
});

describe("useApoderados Hook", () => {
  const mockData = [
    { id: "1", nombre: "Juan Pérez", email: "juan@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[useApoderados #01] Debe cargar apoderados exitosamente al montar.", async () => {
    mockExecute.mockResolvedValue(mockData);

    const { result } = renderHook(() => useApoderados());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.apoderados).toEqual(mockData);
      expect(result.current.loading).toBe(false);
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
    mockExecute.mockResolvedValue([]);
    const { result } = renderHook(() => useApoderados());

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockExecute.mockResolvedValue(mockData);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.apoderados).toEqual(mockData);
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
});
