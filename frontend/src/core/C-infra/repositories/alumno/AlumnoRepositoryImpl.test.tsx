import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/D-config/api";
import type { Alumno, CreateAlumnoDTO, PageResponse } from "@/core/A-domain/entities/alumno/Alumno";
import { AlumnoRepositoryImpl } from "./AlumnoRepositoryImpl";

vi.mock("@/core/D-config/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("AlumnoRepositoryImpl", () => {
  let repository: AlumnoRepositoryImpl;
  const baseUrl = "/alumnos";

  const alumno: Alumno = {
    id: 1,
    nombre: "JUAN PEREZ",
    curso: "4A",
  };

  const pageResponse: PageResponse<Alumno> = {
    content: [alumno],
    page: 0,
    size: 5,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    repository = new AlumnoRepositoryImpl();
    vi.clearAllMocks();
  });

  it("getAll retorna alumnos paginados", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: pageResponse });

    const result = await repository.getAll(0, 5);

    expect(apiClient.get).toHaveBeenCalledWith(baseUrl, { params: { page: 0, size: 5 } });
    expect(result).toEqual(pageResponse);
  });

  it("getById retorna un alumno", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: alumno });

    const result = await repository.getById(1);

    expect(apiClient.get).toHaveBeenCalledWith(`${baseUrl}/1`);
    expect(result).toEqual(alumno);
  });

  it("create envia un POST con el nuevo alumno", async () => {
    const dto: CreateAlumnoDTO = { nombre: "Juan Perez", curso: "4A" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: alumno });

    const result = await repository.create(dto);

    expect(apiClient.post).toHaveBeenCalledWith(baseUrl, dto);
    expect(result).toEqual(alumno);
  });

  it("update envia un PUT con los datos parciales", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { ...alumno, curso: "5B" } });

    const result = await repository.update(1, { curso: "5B" });

    expect(apiClient.put).toHaveBeenCalledWith(`${baseUrl}/1`, { curso: "5B" });
    expect(result.curso).toBe("5B");
  });

  it("delete envia un DELETE al endpoint correcto", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

    await repository.delete(1);

    expect(apiClient.delete).toHaveBeenCalledWith(`${baseUrl}/1`);
  });
});
