import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetApoderadosUseCase } from "./GetApoderadosUseCase";
import type { IApoderadoRepository } from "@/core/domain/repository/apoderado/IApoderadoRepository";
import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";

describe("GetApoderadosUseCase", () => {
  let useCase: GetApoderadosUseCase;
  let mockRepository: IApoderadoRepository;

  // Mock de datos para las pruebas
  const mockApoderados: Apoderado[] = [
    { id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "987654321" },
  ];

  beforeEach(() => {
    // Inicializamos el mock del repositorio
    mockRepository = {
      getAll: vi.fn(),
    } as unknown as IApoderadoRepository;

    useCase = new GetApoderadosUseCase(mockRepository);
  });

  // ========== PRUEBAS DE LÓGICA DE NEGOCIO ==========

  it("[GetApoderados #01] Debe retornar la lista de apoderados desde el repositorio.", async () => {
    // Arrange
    vi.mocked(mockRepository.getAll).mockResolvedValue(mockApoderados);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(result).toEqual(mockApoderados);
    expect(mockRepository.getAll).toHaveBeenCalledTimes(1);
  });

  it("[GetApoderados #02] Debe lanzar un error personalizado si el repositorio falla.", async () => {
    // Arrange
    const rawError = new Error("Connection Refused");
    vi.mocked(mockRepository.getAll).mockRejectedValue(rawError);

    // Act & Assert
    // Verificamos el mensaje del error
    await expect(useCase.execute()).rejects.toThrow("No se pudieron obtener los apoderados");

    // Verificamos que la causa (cause) sea el error original
    try {
      await useCase.execute();
    } catch (error: any) {
      expect(error.cause).toBe(rawError);
    }
  });
});
