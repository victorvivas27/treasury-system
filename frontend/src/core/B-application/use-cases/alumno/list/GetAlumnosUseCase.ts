import type { Alumno, PageResponse } from "@/core/A-domain/entities/alumno/Alumno";
import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";

export class GetAlumnosUseCase {
  private readonly alumnoRepository: IAlumnoRepository;

  constructor(alumnoRepository: IAlumnoRepository) {
    this.alumnoRepository = alumnoRepository;
  }

  async execute(page: number, size: number, search = ""): Promise<PageResponse<Alumno>> {
    try {
      const response = await this.alumnoRepository.getAll(page, size, search);
      return response;
    } catch (error) {
      throw new Error("No se pudieron obtener los alumnos", { cause: error });
    }
  }
}
