import { MemoryRouter, useNavigate, useParams } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditAlumno } from "../useEditAlumno";
import { act, renderHook } from "@testing-library/react";

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: vi.fn(),
  useParams: vi.fn(),
}));

const mockGetUseCase = { execute: vi.fn() };
const mockUpdateUseCase = { execute: vi.fn() };

vi.mock("@/core/B-application/use-cases/alumno/get/GetAlumnoByIdUseCase", () => ({
  GetAlumnoByIdUseCase: vi.fn().mockImplementation(function () {
    return mockGetUseCase;
  }),
}));

vi.mock("@/core/B-application/use-cases/alumno/update/UpdateAlumnoUseCase", () => ({
  UpdateAlumnoUseCase: vi.fn().mockImplementation(function () {
    return mockUpdateUseCase;
  }),
}));

vi.mock("@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl", () => ({
  AlumnoRepositoryImpl: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

describe("useEditAlumno Hook", () => {
  const mockNavigate = vi.fn();
  const mockAlumno = { nombre: "Juan", curso: "4A", observacion: "", fechaNacimiento: "2015-04-12", genero: "OTROS" as const, apoderadoId: 1 };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useParams as any).mockReturnValue({ id: "1" });
    mockGetUseCase.execute.mockResolvedValue(mockAlumno);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("[useEditAlumno #01] Debe poblar formData y establecer initialLoading en false tras una carga exitosa", async () => {
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.formData).toEqual(mockAlumno);
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.loadError).toBe(null);
  });

  it("[useEditAlumno #02] Debe mostrar modal de error y redirigir a /students tras 2 segundos si el alumno no existe", async () => {
    mockGetUseCase.execute.mockResolvedValue(null);
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.modal.isOpen).toBe(true);
    expect(result.current.modal.type).toBe("error");
    expect(result.current.loadError).toEqual({ message: "El alumno no existe en el sistema" });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/students");
  });

  it("[useEditAlumno #03] Debe gestionar fallos de red en la carga, activando loadError con mensaje", async () => {
    mockGetUseCase.execute.mockRejectedValue(new Error("Network Error"));
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.loadError).toEqual({ message: "Error de conexión al cargar los datos" });
    expect(result.current.modal.type).toBe("error");
  });

  it("[useEditAlumno #04] Debe actualizar el estado formData cuando se dispara handleChange", async () => {
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Carlos" } } as any);
      result.current.handleChange({ target: { name: "curso", value: "5B" } } as any);
      result.current.handleChange({ target: { name: "apoderadoId", value: "8" } } as any);
    });

    expect(result.current.formData).toEqual({
      nombre: "Carlos",
      curso: "5B",
      observacion: "",
      fechaNacimiento: "2015-04-12",
      genero: "OTROS",
      apoderadoId: 8,
    });
  });

  it("[useEditAlumno #05] Debe mostrar modal de éxito y redirigir a /students tras 2 segundos si la actualización es correcta", async () => {
    mockUpdateUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.modal.message).toBe("¡Alumno actualizado con éxito!");
    expect(result.current.modal.type).toBe("success");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/students");
  });

  it("[useEditAlumno #06] Debe eliminar el error del estado cuando el campo tiene un error previo y el usuario escribe", async () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: "ERROR_VALIDACION",
          errors: { nombre: "Error previo" },
        },
      },
    };
    mockUpdateUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.fieldErrors.nombre).toBe("Error previo");

    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Nuevo valor" } } as any);
    });

    expect(result.current.fieldErrors.nombre).toBeUndefined();
  });

  it("[useEditAlumno #07] Debe controlar loading durante la edición", async () => {
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockUpdateUseCase.execute.mockReturnValue(promise);
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });
    let submitPromise: any;

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    act(() => {
      submitPromise = result.current.handleSubmit();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise({});
      await submitPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it("[useEditAlumno #08] Debe llamar correctamente al caso de uso con el id y datos del formulario", async () => {
    mockUpdateUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Maria" } } as any);
      result.current.handleChange({ target: { name: "curso", value: "5B" } } as any);
      result.current.handleChange({ target: { name: "fechaNacimiento", value: "2014-09-20" } } as any);
      result.current.handleChange({ target: { name: "apoderadoId", value: "9" } } as any);
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(1, {
      nombre: "Maria",
      curso: "5B",
      observacion: "",
      fechaNacimiento: "2014-09-20",
      genero: "OTROS",
      apoderadoId: 9,
    });
  });

  it("[useEditAlumno #09] Debe retornar inmediatamente si el numericId es inválido", async () => {
    (useParams as any).mockReturnValue({ id: "abc" });
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.loadError).toEqual({ message: "ID de alumno no válido" });
    expect(mockUpdateUseCase.execute).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("[useEditAlumno #10] Debe mostrar error inesperado si el error no es de Axios", async () => {
    mockUpdateUseCase.execute.mockRejectedValue(new Error("Crash total"));
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.modal.message).toBe("Ocurrió un error inesperado");
    expect(result.current.modal.type).toBe("error");
  });

  it("[useEditAlumno #11] Debe mostrar el mensaje por defecto si la respuesta del servidor no incluye uno", async () => {
    const errorSinMensaje = {
      isAxiosError: true,
      response: {
        data: {
          code: "INTERNAL_ERROR",
        },
      },
    };
    mockUpdateUseCase.execute.mockRejectedValue(errorSinMensaje);
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.modal.message).toBe("Error al procesar la solicitud");
    expect(result.current.modal.type).toBe("error");
  });

  it("[useEditAlumno #12] Debe manejar numericId como undefined si el parámetro id no existe en la URL", async () => {
    (useParams as any).mockReturnValue({});
    const { result } = renderHook(() => useEditAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.loadError).toEqual({ message: "ID de alumno no válido" });
    expect(result.current.initialLoading).toBe(false);
  });
});
