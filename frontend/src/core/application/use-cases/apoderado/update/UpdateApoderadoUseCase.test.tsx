import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateApoderadoUseCase } from "./UpdateApoderadoUseCase";
import type { IApoderadoRepository } from "@/core/domain/repository/apoderado/IApoderadoRepository";
import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";

describe('UpdateApoderadoUseCase', () => {
  let useCase: UpdateApoderadoUseCase;
  let mockRepository: IApoderadoRepository;

  const mockApoderado: Apoderado = {
    id: 1,
    nombre: "Juan Pérez",
    email: "juan@example.com",
    telefono: "123456789"
  };

  beforeEach(() => {
    mockRepository = {
      update: vi.fn()
    } as unknown as IApoderadoRepository;
    useCase = new UpdateApoderadoUseCase(mockRepository);
  });

  it('[UpdateApoderadoUseCase #01] debería llamar a apoderadoRepository.update con los argumentos exactos', async () => {
    const updateData = { nombre: "Juan Actualizado" };
    await useCase.execute(1, updateData);

    expect(mockRepository.update).toHaveBeenCalledWith(1, updateData);
    expect(mockRepository.update).toHaveBeenCalledTimes(1);
  });

  it('[UpdateApoderadoUseCase #02] debería retornar el objeto Apoderado devuelto por el repositorio', async () => {
    vi.mocked(mockRepository.update).mockResolvedValue(mockApoderado);

    const result = await useCase.execute(1, { nombre: "Juan Pérez" });

    expect(result).toEqual(mockApoderado);
  });

  it('[UpdateApoderadoUseCase #03] debería propagar la excepción si el repositorio lanza un error', async () => {
    const errorRepo = new Error("Database error");
    vi.mocked(mockRepository.update).mockRejectedValue(errorRepo);

    await expect(useCase.execute(1, {}))
      .rejects.toThrow("Database error");
  });

  it('[UpdateApoderadoUseCase #04] debería manejar el caso donde el repositorio devuelve null si el id no existe', async () => {
    vi.mocked(mockRepository.update).mockResolvedValue(null as any);

    const result = await useCase.execute(99, { nombre: "Inexistente" });

    expect(result).toBeNull();
  });

  it('[UpdateApoderadoUseCase #05] debería procesar correctamente actualizaciones con objetos parciales', async () => {
    const partialData = { telefono: "987654321" };
    await useCase.execute(5, partialData);

    expect(mockRepository.update).toHaveBeenCalledWith(5, partialData);
  });

  it('[UpdateApoderadoUseCase #06] debería asegurar que la promesa se resuelva tras la confirmación del repositorio', async () => {
    let resolved = false;
    vi.mocked(mockRepository.update).mockImplementation(async () => {
      resolved = true;
      return mockApoderado;
    });

    await useCase.execute(1, {});
    expect(resolved).toBe(true);
  });
});
