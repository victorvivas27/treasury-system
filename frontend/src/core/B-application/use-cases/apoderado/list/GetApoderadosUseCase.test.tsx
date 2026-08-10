import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetApoderadosUseCase } from "./GetApoderadosUseCase";
import type { IApoderadoRepository } from "@/core/A-domain/repository/apoderado/IApoderadoRepository";
import type { Apoderado, PageResponse } from "@/core/A-domain/entities/apoderado/Apoderado";

describe("GetApoderadosUseCase", () => {
  let useCase: GetApoderadosUseCase;
  let mockRepository: IApoderadoRepository;

  const mockApoderados: Apoderado[] = [
    { apoderadoId: 1, nombre: "Juan Perez", email: "juan@example.com", telefono: "987654321", codigo: "" },
  ];

  const mockPageResponse: PageResponse<Apoderado> = {
    content: mockApoderados,
    page: 0,
    size: 5,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    mockRepository = {
      getAll: vi.fn(),
    } as unknown as IApoderadoRepository;

    useCase = new GetApoderadosUseCase(mockRepository);
  });

  it("[GetApoderados #01] Debe retornar la lista paginada de apoderados desde el repositorio.", async () => {
    vi.mocked(mockRepository.getAll).mockResolvedValue(mockPageResponse);

    const result = await useCase.execute(0, 5);

    expect(result).toEqual(mockPageResponse);
    expect(mockRepository.getAll).toHaveBeenCalledTimes(1);
    expect(mockRepository.getAll).toHaveBeenCalledWith(0, 5, "");
  });

  it("[GetApoderados #02] Debe lanzar un error personalizado si el repositorio falla.", async () => {
    const rawError = new Error("Connection Refused");
    vi.mocked(mockRepository.getAll).mockRejectedValue(rawError);

    await expect(useCase.execute(0, 5)).rejects.toThrow("No se pudieron obtener los apoderados");

    try {
      await useCase.execute(0, 5);
    } catch (error: any) {
      expect(error.cause).toBe(rawError);
    }
  });
});
