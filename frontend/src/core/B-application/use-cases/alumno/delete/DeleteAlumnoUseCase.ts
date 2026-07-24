import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";

export class DeleteAlumnoUseCase {
  private readonly alumnoRepository: IAlumnoRepository;

  constructor(alumnoRepository: IAlumnoRepository) {
    this.alumnoRepository = alumnoRepository;
  }

  async execute(codigo: string): Promise<void> {
    return await this.alumnoRepository.deleteByCodigo(codigo);
  }
}
