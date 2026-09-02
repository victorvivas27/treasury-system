import { CreateAlumnoUseCase } from "@/core/B-application/use-cases/alumno/create/CreateAlumnoUseCase";
import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateAlumno } from "../useCreateAlumno";

const mockGetManagedCourseSettings = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: vi.fn(),
}));

const mockCreateUseCase = { execute: vi.fn() };

vi.mock("@/core/B-application/use-cases/alumno/create/CreateAlumnoUseCase", () => ({
  CreateAlumnoUseCase: vi.fn().mockImplementation(function () {
    return mockCreateUseCase;
  }),
}));

vi.mock("@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl", () => ({
  AlumnoRepositoryImpl: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({
  TreasuryRepositoryImpl: vi.fn().mockImplementation(function () {
    return {
      getManagedCourseSettings: mockGetManagedCourseSettings,
    };
  }),
}));

describe("useCreateAlumno", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    mockGetManagedCourseSettings.mockReturnValue(new Promise(() => {}));
  });

  it("[useCreateAlumno #01] Debe inicializar los estados con valores por defecto", () => {
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    expect(result.current.formData).toEqual({
      nombre: "",
      curso: "",
      observacion: "",
      fechaNacimiento: "",
      genero: "OTROS",
      apoderadoId: 0,
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.modal).toEqual({
      isOpen: false,
      message: "",
      type: "success",
    });
  });

  it("[useCreateAlumno #02] Debe actualizar el estado formData cuando se dispara handleChange", () => {
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Juan" } } as any);
      result.current.handleChange({ target: { name: "curso", value: "4A" } } as any);
      result.current.handleChange({ target: { name: "apoderadoId", value: "7" } } as any);
    });

    expect(result.current.formData).toEqual({
      nombre: "Juan",
      curso: "4A",
      observacion: "",
      fechaNacimiento: "",
      genero: "OTROS",
      apoderadoId: 7,
    });
  });

  it("[useCreateAlumno #03] Debe crear un alumno exitosamente", async () => {
    mockCreateUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Juan" } } as any);
      result.current.handleChange({ target: { name: "curso", value: "4A" } } as any);
      result.current.handleChange({ target: { name: "apoderadoId", value: "7" } } as any);
    });

    await act(async () => {
      await result.current.handleActionSubmit();
    });

    expect(result.current.modal.message).toBe("¡Datos guardados con éxito!");
    expect(result.current.modal.type).toBe("success");
    expect(result.current.formData).toEqual({
      nombre: "",
      curso: "",
      observacion: "",
      fechaNacimiento: "",
      genero: "OTROS",
      apoderadoId: 0,
    });
  });

  it("[useCreateAlumno #04] Debe manejar errores de validación del servidor", async () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: "ERROR_VALIDACION",
          errors: { nombre: "El nombre es obligatorio" },
        },
      },
    };
    mockCreateUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleActionSubmit();
    });

    expect(result.current.fieldErrors.nombre).toBe("El nombre es obligatorio");
    expect(result.current.loading).toBe(false);
    expect(result.current.modal.isOpen).toBe(false);
  });

  it("[useCreateAlumno #05] Debe controlar loading durante la creación", async () => {
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockCreateUseCase.execute.mockReturnValue(promise);
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });
    let submitPromise: any;

    act(() => {
      submitPromise = result.current.handleActionSubmit();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise({});
      await submitPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it("[useCreateAlumno #06] Debe llamar correctamente al caso de uso con los datos del formulario", async () => {
    mockCreateUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Maria" } } as any);
      result.current.handleChange({ target: { name: "curso", value: "5B" } } as any);
      result.current.handleChange({ target: { name: "fechaNacimiento", value: "2015-04-12" } } as any);
      result.current.handleChange({ target: { name: "apoderadoId", value: "9" } } as any);
    });

    await act(async () => {
      await result.current.handleActionSubmit();
    });

    expect(AlumnoRepositoryImpl).toHaveBeenCalled();
    expect(CreateAlumnoUseCase).toHaveBeenCalled();
    expect(mockCreateUseCase.execute).toHaveBeenCalledWith({
      nombre: "Maria",
      curso: "5B",
      observacion: "",
      fechaNacimiento: "2015-04-12",
      genero: "OTROS",
      apoderadoId: 9,
    });
  });

  it("[useCreateAlumno #07] Debe cerrar el modal y navegar a /students si la creación fue exitosa", () => {
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    act(() => {
      result.current.setModal({
        isOpen: true,
        message: "¡Datos guardados con éxito!",
        type: "success",
      });
    });
    act(() => {
      result.current.closeModal();
    });

    expect(result.current.modal.isOpen).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith("/students");
  });

  it("[useCreateAlumno #08] Debe limpiar el error de campo cuando cambia su valor", async () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: "ERROR_VALIDACION",
          errors: {
            nombre: "El nombre es obligatorio",
            curso: "El curso es obligatorio",
          },
        },
      },
    };
    mockCreateUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleActionSubmit();
    });

    act(() => {
      result.current.handleChange({ target: { name: "nombre", value: "Ana" } } as any);
    });

    expect(result.current.fieldErrors).toEqual({
      curso: "El curso es obligatorio",
    });
  });

  it("[useCreateAlumno #09] Debe mostrar error inesperado cuando falla sin respuesta Axios", async () => {
    mockCreateUseCase.execute.mockRejectedValue(new Error("Network Error"));
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleActionSubmit();
    });

    expect(result.current.modal).toEqual({
      isOpen: true,
      message: "Ocurrió un error inesperado",
      type: "error",
    });
    expect(result.current.loading).toBe(false);
  });

  it("[useCreateAlumno #10] Debe mostrar el mensaje del servidor para errores generales", async () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: "ERROR_NEGOCIO",
          message: "No se pudo crear el alumno",
        },
      },
    };
    mockCreateUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleActionSubmit();
    });

    expect(result.current.modal).toEqual({
      isOpen: true,
      message: "No se pudo crear el alumno",
      type: "error",
    });
    expect(result.current.loading).toBe(false);
  });

  it("[useCreateAlumno #11] Debe convertir apoderadoId vacío a cero", () => {
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    act(() => {
      result.current.handleChange({ target: { name: "apoderadoId", value: "" } } as any);
    });

    expect(result.current.formData.apoderadoId).toBe(0);
  });

  it("[useCreateAlumno #12] Debe cerrar el modal sin navegar cuando el modal es de error", () => {
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    act(() => {
      result.current.setModal({
        isOpen: true,
        message: "No se pudo crear el alumno",
        type: "error",
      });
    });
    act(() => {
      result.current.closeModal();
    });

    expect(result.current.modal.isOpen).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("[useCreateAlumno #13] Debe mostrar mensaje por defecto para errores generales sin mensaje", async () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: "ERROR_NEGOCIO",
        },
      },
    };
    mockCreateUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleActionSubmit();
    });

    expect(result.current.modal).toEqual({
      isOpen: true,
      message: "Error al procesar la solicitud",
      type: "error",
    });
    expect(result.current.loading).toBe(false);
  });

  it("[useCreateAlumno #14] Debe cargar cursos desde configuracion e historial", async () => {
    mockGetManagedCourseSettings.mockResolvedValue({
      course: "2A",
      schoolYear: 2027,
      history: [
        { course: "2A", schoolYear: 2027 },
        { course: "1A", schoolYear: 2026 },
      ],
    });
    const { result } = renderHook(() => useCreateAlumno(), { wrapper: MemoryRouter });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.courses).toEqual(["2A", "1A"]);
    expect(result.current.formData.curso).toBe("2A");
    expect(result.current.loadingCourses).toBe(false);
  });
});
