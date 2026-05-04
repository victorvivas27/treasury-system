import { MemoryRouter, useNavigate, useParams } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditApoderado } from "../useEditApoderado";
import { act, renderHook } from "@testing-library/react";

// Mocks de navegación
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: vi.fn(),
  useParams: vi.fn(),
}));

// Objetos mock para los métodos execute
const mockGetUseCase = { execute: vi.fn() };
const mockUpdateUseCase = { execute: vi.fn() };

// MOCKS DE LOS CASOS DE USO
// Importante: Usamos 'function' tradicional para que actúen como constructores
vi.mock("@/core/application/use-cases/apoderado/byid/GetApoderadoByIdUseCase", () => ({
  GetApoderadoByIdUseCase: vi.fn().mockImplementation(function() {
    return mockGetUseCase;
  }),
}));

vi.mock("@/core/application/use-cases/apoderado/update/UpdateApoderadoUseCase", () => ({
  UpdateApoderadoUseCase: vi.fn().mockImplementation(function() {
    return mockUpdateUseCase;
  }),
}));

// Mock del Repositorio (ya que el hook hace 'new ApoderadoRepositoryImpl')
vi.mock("@/core/infra/repositories/apoderado/ApoderadoRepositoryImpl", () => ({
  ApoderadoRepositoryImpl: vi.fn().mockImplementation(function() {
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

  it("[useEditApoderado #01] Debe inicializar con initialLoading: true, loading: false y loadError: false.", () => {
    (useParams as any).mockReturnValue({ id: 1 });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    expect(result.current.initialLoading).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.loadError).toBe(false);
  });

  it("[useEditApoderado #02] Debe activar loadError inmediatamente si el id de la URL es indefinido.", () => {
    (useParams as any).mockReturnValue({ id: undefined });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    expect(result.current.loadError).toBe(true);
  });

  it("[useEditApoderado #03] Debe activar loadError si el id de la URL no es un número válido.", () => {
    (useParams as any).mockReturnValue({ id: "abc" });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    expect(result.current.loadError).toBe(true);
  });

  it("[useEditApoderado #04] Debe ejecutar getUseCase.execute con el ID numérico correcto al montar el hook.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    expect(mockGetUseCase.execute).toHaveBeenCalledWith(1);
  });

  it("[useEditApoderado #05] Debe poblar formData y establecer initialLoading en false tras una carga exitosa.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    mockGetUseCase.execute.mockResolvedValue({ nombre: "Juan", email: "j@j.com", telefono: "123", observaciones: "" });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

    await act(async () => { await vi.runAllTimersAsync(); });

    expect(result.current.formData.nombre).toBe("Juan");
    expect(result.current.initialLoading).toBe(false);
  });

  it("[useEditApoderado #06] Debe mostrar modal de error y redirigir a /parents tras 2 segundos si el apoderado no existe.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    mockGetUseCase.execute.mockResolvedValue(null);
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.modal.isOpen).toBe(true);

    act(() => { vi.advanceTimersByTime(2000); });
    expect(mockNavigate).toHaveBeenCalledWith("/parents");
  });

  it("[useEditApoderado #07] Debe gestionar fallos de red en la carga, activando loadError y mostrando el modal de advertencia.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    mockGetUseCase.execute.mockRejectedValue(new Error());
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.loadError).toBe(true);
    expect(result.current.modal.type).toBe("error");
  });

  it("[useEditApoderado #08] Debe actualizar el estado formData cuando se dispara handleChange.", () => {
    (useParams as any).mockReturnValue({ id: 1 });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Carlos" } } as any);
    });
    expect(result.current.formData.nombre).toBe("Carlos");
  });

  it("[useEditApoderado #09] Debe eliminar el mensaje de error específico de un campo en fieldErrors cuando el usuario vuelve a escribir en él.", () => {
    (useParams as any).mockReturnValue({ id: 1 });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });
    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "A" } } as any);
    });
    expect(result.current.fieldErrors.nombre).toBeUndefined();
  });

 it("[useEditApoderado #10] Debe activar el estado loading al iniciar handleSubmit y desactivarlo al finalizar.", async () => {
    (useParams as any).mockReturnValue({ id: "1" });

    // Creamos una promesa controlada para que no se resuelva instantáneamente
    let resolvePromise: any;
    const delayedPromise = new Promise((resolve) => { resolvePromise = resolve; });
    mockUpdateUseCase.execute.mockReturnValue(delayedPromise);

    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

    // 1. Esperamos que termine la carga inicial para limpiar el ruido de act()
    await act(async () => { await vi.runAllTimersAsync(); });

    // 2. Ejecutamos el submit sin esperar el await todavía
    let submitPromise: any;
    act(() => {
      submitPromise = result.current.handleSubmit();
    });

    // 3. Verificamos que está cargando mientras la promesa está pendiente
    expect(result.current.loading).toBe(true);

    // 4. Resolvemos la promesa y esperamos el final
    await act(async () => {
      resolvePromise({});
      await submitPromise;
    });

    // 5. Verificamos que terminó de cargar
    expect(result.current.loading).toBe(false);
  });

  it("[useEditApoderado #11] Debe llamar a updateUseCase.execute con el ID numérico y los datos actuales del formulario.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

    await act(async () => { await vi.runAllTimersAsync(); }); // Esperar carga inicial

    await act(async () => { await result.current.handleSubmit(); });
    expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(1, result.current.formData);
  });

  it("[useEditApoderado #12] Debe mostrar modal de éxito y redirigir a /parents tras 2 segundos si la actualización es correcta.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    mockUpdateUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

    await act(async () => { await vi.runAllTimersAsync(); }); // Esperar carga inicial

    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.modal.type).toBe("success");

    act(() => { vi.advanceTimersByTime(2000); });
    expect(mockNavigate).toHaveBeenCalledWith("/parents");
  });

  it("[useEditApoderado #13] Debe capturar errores de validación del backend (ERROR_VALIDACION) y mapearlos al estado fieldErrors.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });
    const error = { isAxiosError: true, response: { data: { code: "ERROR_VALIDACION", errors: { nombre: "Requerido" } } } };
    mockUpdateUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

    await act(async () => { await vi.runAllTimersAsync(); }); // Esperar carga inicial

    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.fieldErrors.nombre).toBe("Requerido");
  });


  it("[useEditApoderado #14] Debe eliminar el error del estado cuando el campo tiene un error previo y el usuario escribe.", async () => {
  (useParams as any).mockReturnValue({ id: "1" });
  const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

  // 1. Forzamos un error de validación primero
  const error = {
    isAxiosError: true,
    response: { data: { code: "ERROR_VALIDACION", errors: { nombre: "Error previo" } } }
  };
  mockUpdateUseCase.execute.mockRejectedValue(error);

  await act(async () => { await result.current.handleSubmit(); });
  expect(result.current.fieldErrors.nombre).toBe("Error previo");

  // 2. AHORA ejecutamos el handleChange para cubrir la línea del delete
  act(() => {
    result.current.handleChange({ target: { name: "nombre", value: "Nuevo valor" } } as any);
  });

  expect(result.current.fieldErrors.nombre).toBeUndefined();
});
it("[useEditApoderado #15] handleSubmit debe retornar inmediatamente si el numericId es inválido.", async () => {
  // Simulamos que el ID cambia a algo inválido después del render
  (useParams as any).mockReturnValue({ id: "abc" });
  const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

  await act(async () => {
    await result.current.handleSubmit();
  });

  // Verificamos que no se intentó llamar al caso de uso
  expect(mockUpdateUseCase.execute).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false); // El loading nunca debió ponerse en true
});
it("[useEditApoderado #16] Debe mostrar mensaje genérico si el error de Axios no es de validación.", async () => {
  (useParams as any).mockReturnValue({ id: 1 });
  const errorGeneric = {
    isAxiosError: true,
    response: { data: { message: "Servidor caído" } }
  };
  mockUpdateUseCase.execute.mockRejectedValue(errorGeneric);

  const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

  await act(async () => { await result.current.handleSubmit(); });

  expect(result.current.modal.message).toBe("Servidor caído");
  expect(result.current.modal.type).toBe("error");
});

it("[useEditApoderado #17] Debe mostrar error inesperado si el error no es de Axios (ej: error de código).", async () => {
  (useParams as any).mockReturnValue({ id: 1 });
  // Error que NO es de axios
  mockUpdateUseCase.execute.mockRejectedValue(new Error("Crash total"));

  const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

  await act(async () => { await result.current.handleSubmit(); });

  expect(result.current.modal.message).toBe("Ocurrió un error inesperado");
});

it("[useEditApoderado #18] Debe mostrar el mensaje por defecto si la respuesta del servidor no incluye uno.", async () => {
    (useParams as any).mockReturnValue({ id: 1 });

    // Simulamos un error de Axios que tiene respuesta pero NO tiene mensaje
    const errorSinMensaje = {
      isAxiosError: true,
      response: {
        data: {
          code: "INTERNAL_ERROR"
          // message: undefined <--- Esto disparará el || "Error al procesar..."
        }
      }
    };
    mockUpdateUseCase.execute.mockRejectedValue(errorSinMensaje);

    const { result } = renderHook(() => useEditApoderado(), { wrapper: MemoryRouter });

    // Esperamos carga inicial
    await act(async () => { await vi.runAllTimersAsync(); });

    // Ejecutamos el envío
    await act(async () => {
      await result.current.handleSubmit();
    });

    // Verificamos que se usó el mensaje por defecto del operador ||
    expect(result.current.modal.message).toBe("Error al procesar la solicitud");
    expect(result.current.modal.type).toBe("error");
  });
});
