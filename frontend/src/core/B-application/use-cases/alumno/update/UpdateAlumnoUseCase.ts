import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";

export class UpdateAlumnoUseCase {
  private readonly alumnoRepository: IAlumnoRepository;

  constructor(alumnoRepository: IAlumnoRepository) {
    this.alumnoRepository = alumnoRepository;
  }

  async execute(codigo: string, datosActualizados: Partial<Alumno>): Promise<Alumno> {
    const alumno = await this.alumnoRepository.updateByCodigo(codigo, datosActualizados);
    return alumno;
  }
}
