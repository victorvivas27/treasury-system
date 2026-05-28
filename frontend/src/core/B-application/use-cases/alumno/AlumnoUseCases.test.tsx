import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alumno, CreateAlumnoDTO, PageResponse } from "@/core/A-domain/entities/alumno/Alumno";
import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";
import { CreateAlumnoUseCase } from "./create/CreateAlumnoUseCase";
import { DeleteAlumnoUseCase } from "./delete/DeleteAlumnoUseCase";
import { GetAlumnoByIdUseCase } from "./get/GetAlumnoByIdUseCase";
import { GetAlumnosUseCase } from "./list/GetAlumnosUseCase";
import { UpdateAlumnoUseCase } from "./update/UpdateAlumnoUseCase";

describe("Alumno use cases", () => {
  let repository: IAlumnoRepository;

  const alumno: Alumno = {
    id: 1,
    nombre: "JUAN PEREZ",
    curso: "4A",
    apoderadoId: 1,
  };

  const createDto: CreateAlumnoDTO = {
    nombre: "Juan Perez",
    curso: "4A",
    apoderadoId: 1,
  };

  const pageResponse: PageResponse<Alumno> = {
    content: [alumno],
    page: 0,
    size: 5,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    repository = {
      getAll: vi.fn(),
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
  });

  it("CreateAlumnoUseCase delega la creacion al repositorio", async () => {
    vi.mocked(repository.create).mockResolvedValue(alumno);

    const result = await new CreateAlumnoUseCase(repository).execute(createDto);

    expect(repository.create).toHaveBeenCalledWith(createDto);
    expect(result).toEqual(alumno);
  });

  it("GetAlumnosUseCase retorna la respuesta paginada", async () => {
    vi.mocked(repository.getAll).mockResolvedValue(pageResponse);

    const result = await new GetAlumnosUseCase(repository).execute(0, 5);

    expect(repository.getAll).toHaveBeenCalledWith(0, 5);
    expect(result).toEqual(pageResponse);
  });

  it("GetAlumnoByIdUseCase busca por id", async () => {
    vi.mocked(repository.getById).mockResolvedValue(alumno);

    const result = await new GetAlumnoByIdUseCase(repository).execute(1);

    expect(repository.getById).toHaveBeenCalledWith(1);
    expect(result).toEqual(alumno);
  });

  it("UpdateAlumnoUseCase actualiza por id", async () => {
    vi.mocked(repository.update).mockResolvedValue({ ...alumno, curso: "5B" });

    const result = await new UpdateAlumnoUseCase(repository).execute(1, { curso: "5B" });

    expect(repository.update).toHaveBeenCalledWith(1, { curso: "5B" });
    expect(result.curso).toBe("5B");
  });

  it("DeleteAlumnoUseCase elimina por id", async () => {
    vi.mocked(repository.delete).mockResolvedValue(undefined);

    await new DeleteAlumnoUseCase(repository).execute(1);

    expect(repository.delete).toHaveBeenCalledWith(1);
  });
});
