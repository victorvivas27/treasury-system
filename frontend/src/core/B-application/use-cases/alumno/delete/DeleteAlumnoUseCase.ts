import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";

export class DeleteAlumnoUseCase {
  private readonly alumnoRepository: IAlumnoRepository;

  constructor(alumnoRepository: IAlumnoRepository) {
    this.alumnoRepository = alumnoRepository;
  }

  async execute(id: number): Promise<void> {
    return await this.alumnoRepository.delete(id);
  }
}
