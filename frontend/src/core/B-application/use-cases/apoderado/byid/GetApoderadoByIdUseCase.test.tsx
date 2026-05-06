import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetApoderadoByIdUseCase } from "./GetApoderadoByIdUseCase";
import type { IApoderadoRepository } from "@/core/A-domain/repository/apoderado/IApoderadoRepository";
import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";

describe('GetApoderadoByIdUseCase', () => {
  let useCase: GetApoderadoByIdUseCase;
  let mockRepository: IApoderadoRepository;

  const mockApoderado: Apoderado = {
    id: 10,
    nombre: "Test Apoderado",
    email: "test@example.com",
    telefono: "999999999"
  };

  beforeEach(() => {
    mockRepository = {
      getById: vi.fn()
    } as unknown as IApoderadoRepository;
    useCase = new GetApoderadoByIdUseCase(mockRepository);
  });

  it('[GetApoderadoByIdUseCase #01] debería llamar a apoderadoRepository.getById con el ID correcto', async () => {
    await useCase.execute(10);
    expect(mockRepository.getById).toHaveBeenCalledWith(10);
  });

  it('[GetApoderadoByIdUseCase #02] debería retornar el apoderado cuando existe', async () => {
    vi.mocked(mockRepository.getById).mockResolvedValue(mockApoderado);
    const result = await useCase.execute(10);
    expect(result).toEqual(mockApoderado);
  });

  it('[GetApoderadoByIdUseCase #03] debería retornar null cuando el repositorio no encuentra resultados', async () => {
    vi.mocked(mockRepository.getById).mockResolvedValue(null);
    const result = await useCase.execute(99);
    expect(result).toBeNull();
  });

  it('[GetApoderadoByIdUseCase #04] debería lanzar un error con mensaje personalizado y causa si el repositorio falla', async () => {
    const originalError = new Error("Connection failed");
    vi.mocked(mockRepository.getById).mockRejectedValue(originalError);

    await expect(useCase.execute(10)).rejects.toThrow("Error al obtener el apoderado con ID: 10");

    try {
      await useCase.execute(10);
    } catch (error: any) {
      expect(error.cause).toBe(originalError);
    }
  });
});
