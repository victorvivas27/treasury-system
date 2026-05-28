import type { Alumno, CreateAlumnoDTO } from "@/core/A-domain/entities/alumno/Alumno";
import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";

export class CreateAlumnoUseCase {
  private readonly alumnoRepository: IAlumnoRepository;

  constructor(alumnoRepository: IAlumnoRepository) {
    this.alumnoRepository = alumnoRepository;
  }

  async execute(alumnoData: CreateAlumnoDTO): Promise<Alumno> {
    return await this.alumnoRepository.create(alumnoData);
  }
}
