import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/D-config/api";
import { ApoderadoRepositoryImpl } from "./ApoderadoRepositoryImpl";
import type { Apoderado, CreateApoderadoDTO, PageResponse } from "@/core/A-domain/entities/apoderado/Apoderado";

// Mockeamos el cliente de API
vi.mock("@/core/D-config/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("ApoderadoRepositoryImpl", () => {
  let repository: ApoderadoRepositoryImpl;
  const baseUrl = "/apoderados";

  const mockApoderado: Apoderado = {
    apoderadoId: 1,
    nombre: "Juan Perez",
    email: "juan@test.com",
    telefono: "123456",
    codigo: ""
  };

  const mockPageResponse: PageResponse<Apoderado> = {
    content: [mockApoderado],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1
  };

  beforeEach(() => {
    repository = new ApoderadoRepositoryImpl();
    vi.clearAllMocks();
  });

  // ========== 1. MÉTODOS DE LECTURA ==========

  it("[ApoderadoRepo #01] getAll: debe retornar lista paginada de apoderados", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockPageResponse });

    const page = 0;
    const size = 10;
    const result = await repository.getAll(page, size);

    expect(apiClient.get).toHaveBeenCalledWith(baseUrl, {
      params: { page, size }
    });
    expect(result).toEqual(mockPageResponse);
  });

  it("[ApoderadoRepo #02] getById: debe retornar un apoderado por ID", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockApoderado });

    const result = await repository.getById(1);

    expect(apiClient.get).toHaveBeenCalledWith(`${baseUrl}/1`);
    expect(result).toEqual(mockApoderado);
  });

  // ========== 2. MÉTODOS DE ESCRITURA ==========

  it("[ApoderadoRepo #03] create: debe enviar un POST con los datos del nuevo apoderado", async () => {
    const dto: CreateApoderadoDTO = {
      nombre: "Nuevo", email: "nuevo@test.com", telefono: "999",
      codigo: ""
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ...dto, apoderadoId: 2 } });

    const result = await repository.create(dto);

    expect(apiClient.post).toHaveBeenCalledWith(baseUrl, dto);
    expect(result.apoderadoId).toBe(2);
  });

  it("[ApoderadoRepo #04] update: debe enviar un PUT con los datos parciales", async () => {
    const updateData = { nombre: "Nombre Editado" };
    vi.mocked(apiClient.put).mockResolvedValue({ data: { ...mockApoderado, ...updateData } });

    const result = await repository.update(1, updateData);

    expect(apiClient.put).toHaveBeenCalledWith(`${baseUrl}/1`, updateData);
    expect(result.nombre).toBe("Nombre Editado");
  });

  it("[ApoderadoRepo #05] delete: debe enviar un DELETE al endpoint correcto", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

    await repository.delete(1);

    expect(apiClient.delete).toHaveBeenCalledWith(`${baseUrl}/1`);
  });
});
