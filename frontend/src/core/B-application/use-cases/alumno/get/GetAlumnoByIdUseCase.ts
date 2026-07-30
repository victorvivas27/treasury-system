import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";

export class GetAlumnoByIdUseCase {
  private readonly alumnoRepository: IAlumnoRepository;

  constructor(alumnoRepository: IAlumnoRepository) {
    this.alumnoRepository = alumnoRepository;
  }

  async execute(codigo:string): Promise<Alumno | null> {
    return await this.alumnoRepository.getByCodigo(codigo);
  }
}
