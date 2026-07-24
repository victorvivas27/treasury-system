import { MemoryRouter, useNavigate, useParams } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditApoderado } from "../useEditApoderado";
import { act, renderHook } from "@testing-library/react";

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: vi.fn(),
  useParams: vi.fn(),
}));

const mockGetUseCase = { execute: vi.fn() };
const mockUpdateUseCase = { execute: vi.fn() };

vi.mock("@/core/B-application/use-cases/apoderado/byid/GetApoderadoByIdUseCase", () => ({
  GetApoderadoByIdUseCase: vi.fn().mockImplementation(function () {
    return mockGetUseCase;
  }),
}));

vi.mock("@/core/B-application/use-cases/apoderado/update/UpdateApoderadoUseCase", () => ({
  UpdateApoderadoUseCase: vi.fn().mockImplementation(function () {
    return mockUpdateUseCase;
  }),
}));

vi.mock("@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl", () => ({
  ApoderadoRepositoryImpl: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

describe('useEditApoderado Hook', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("[useEditApoderado #01] Debe poblar formData y establecer initialLoading en false tras una carga exitosa.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    mockGetUseCase.execute.mockResolvedValue({ nombre: "Juan", email: "j@j.com", telefono: "123", observaciones: "" });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.formData.nombre).toBe("Juan");
    expect(result.current.initialLoading).toBe(false);
  });

  it("[useEditApoderado #03] Debe mostrar modal de error y redirigir a /parents tras 2 segundos si el apoderado no existe.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    mockGetUseCase.execute.mockResolvedValue(null);
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.modal.isOpen).toBe(true);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(mockNavigate).toHaveBeenCalledWith("/parents");
  });

  it("[useEditApoderado #04] Debe gestionar fallos de red en la carga, activando loadError con mensaje.", async () => {
    (useParams as any).mockReturnValue({ id: "1" });
    mockGetUseCase.execute.mockRejectedValue(new Error("Network Error"));
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.loadError).toEqual({ message: "Error de conexión al cargar los datos" });
    expect(result.current.modal.type).toBe("error");
  });

  it("[useEditApoderado #05] Debe actualizar el estado formData cuando se dispara handleChange.", async () => {
    (useParams as any).mockReturnValue({ apoderadoId: "AP-1" });
    mockGetUseCase.execute.mockResolvedValue({ nombre: "", email: "", telefono: "", observaciones: "" });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    await act(async () => { await vi.runAllTimersAsync(); });
    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Carlos" } } as any);
    });
    expect(result.current.formData.nombre).toBe("Carlos");
  });

  it("[useEditApoderado #06] Debe mostrar modal de éxito y redirigir a /parents tras 2 segundos si la actualización es correcta.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    mockUpdateUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    await act(async () => { await vi.runAllTimersAsync(); });
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.modal.type).toBe("success");
    act(() => { vi.advanceTimersByTime(2000); });
    expect(mockNavigate).toHaveBeenCalledWith("/parents");
  });

  it("[useEditApoderado #07] Debe eliminar el error del estado cuando el campo tiene un error previo y el usuario escribe.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    const error = {
      isAxiosError: true,
      response: { data: { code: "ERROR_VALIDACION", errors: { nombre: "Error previo" } } }
    };
    mockUpdateUseCase.execute.mockRejectedValue(error);
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.fieldErrors.nombre).toBe("Error previo");
    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Nuevo valor" } } as any);
    });
    expect(result.current.fieldErrors.nombre).toBeUndefined();
  });

  it("[useEditApoderado #08] handleSubmit debe retornar inmediatamente si el numericId es inválido.", async () => {
    (useParams as any).mockReturnValue({ id: "abc" });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    await act(async () => {
      await result.current.handleSubmit();
    });

    // Verificamos que no se intentó llamar al caso de uso
    expect(mockUpdateUseCase.execute).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false); // El loading nunca debió ponerse en true
  });

  it("[useEditApoderado #09] Debe mostrar error inesperado si el error no es de Axios (ej: error de código).", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    mockUpdateUseCase.execute.mockRejectedValue(new Error("Crash total"));
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.modal.message).toBe("Ocurrió un error inesperado");
  });

  it("[useEditApoderado #10] Debe mostrar el mensaje por defecto si la respuesta del servidor no incluye uno.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    const errorSinMensaje = {
      isAxiosError: true,
      response: {
        data: {
          code: "INTERNAL_ERROR"
        }
      }
    };
    mockUpdateUseCase.execute.mockRejectedValue(errorSinMensaje);
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    await act(async () => { await vi.runAllTimersAsync(); });

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(result.current.modal.message).toBe("Error al procesar la solicitud");
    expect(result.current.modal.type).toBe("error");
  });


  it("[useEditApoderado #11] Debe manejar numericId como undefined si el parámetro id no existe en la URL.", async () => {
    (useParams as any).mockReturnValue({});

    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.loadError).toEqual({ message: "ID de apoderado no válido" });
    expect(result.current.initialLoading).toBe(false);
  });
});
