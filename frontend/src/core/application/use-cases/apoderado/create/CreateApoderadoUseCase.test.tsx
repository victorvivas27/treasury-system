import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateApoderadoUseCase } from "@/core/application/use-cases/apoderado/create/CreateApoderadoUseCase";
import type { IApoderadoRepository } from "@/core/domain/repository/apoderado/IApoderadoRepository";
import type { Apoderado, CreateApoderadoDTO } from "@/core/domain/entities/apoderado/Apoderado";


describe("CrearApoderadoForm Component", () => {
  // Limpia el DOM luego de cada test para evitar interferencias
  afterEach(() => {
    cleanup();
  });


  let useCase: CreateApoderadoUseCase;
  let mockRepository: IApoderadoRepository;

  // Mock de datos para las pruebas
  const dto: CreateApoderadoDTO = {
    nombre: "Juan Pérez",
    email: "juan@example.com",
    telefono: "987654321"
  };

  const expectedResult: Apoderado = {
    id: 1,
    ...dto
  };

  beforeEach(() => {
    // Inicializamos el mock del repositorio
    mockRepository = {
      create: vi.fn(),
    } as unknown as IApoderadoRepository;

    useCase = new CreateApoderadoUseCase(mockRepository);
  });


  it("[CreateApoderado #01] Debe llamar al repositorio con los datos correctos y retornar el nuevo apoderado.", async () => {
    // Arrange
    vi.mocked(mockRepository.create).mockResolvedValue(expectedResult);

    // Act
    const result = await useCase.execute(dto);

    // Assert
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expectedResult);
    expect(mockRepository.create).toHaveBeenCalledTimes(1);
  });

  it("[CreateApoderado #02] Debe propagar el error si el repositorio falla.", async () => {
    // Arrange
    const repoError = new Error("Error de validación en el servidor");
    vi.mocked(mockRepository.create).mockRejectedValue(repoError);

    // Act & Assert
    await expect(useCase.execute(dto)).rejects.toThrow("Error de validación en el servidor");
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
  });
});
