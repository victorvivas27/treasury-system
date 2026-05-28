import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetAlumnosUseCase } from "./GetAlumnosUseCase";
import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";
import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import type { PageResponse } from "@/core/A-domain/entities/apoderado/Apoderado";


describe("GetAlumnosUseCase", () => {
  let useCase: GetAlumnosUseCase;
  let mockRepository: IAlumnoRepository;

  const mockAlumnos: Alumno[] = [
    { id: 1, nombre: "Juan Perez", curso: "4A", apoderadoId: 1 },
  ];

  const mockPageResponse: PageResponse<Alumno> = {
    content: mockAlumnos,
    page: 0,
    size: 5,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    mockRepository = {
      getAll: vi.fn(),
    } as unknown as IAlumnoRepository;

    useCase = new GetAlumnosUseCase(mockRepository);
  });

  it("[GetAlumnos #01] Debe retornar la lista paginada de alumnos desde el repositorio.", async () => {
    vi.mocked(mockRepository.getAll).mockResolvedValue(mockPageResponse);

    const result = await useCase.execute(0, 5);

    expect(result).toEqual(mockPageResponse);
    expect(mockRepository.getAll).toHaveBeenCalledTimes(1);
    expect(mockRepository.getAll).toHaveBeenCalledWith(0, 5);
  });

  it("[GetAlumnos #02] Debe lanzar un error personalizado si el repositorio falla.", async () => {
    const rawError = new Error("Connection Refused");
    vi.mocked(mockRepository.getAll).mockRejectedValue(rawError);

    await expect(useCase.execute(0, 5)).rejects.toThrow("No se pudieron obtener los alumnos");

    try {
      await useCase.execute(0, 5);
    } catch (error: any) {
      expect(error.cause).toBe(rawError);
    }
  });
});
