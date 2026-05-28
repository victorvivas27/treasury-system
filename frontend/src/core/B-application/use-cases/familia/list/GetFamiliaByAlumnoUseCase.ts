import type { AlumnoApoderado } from "@/core/A-domain/entities/familia/Familia";
import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class GetFamiliaByAlumnoUseCase {
  private readonly familiaRepository: IFamiliaRepository;

  constructor(familiaRepository: IFamiliaRepository) {
    this.familiaRepository = familiaRepository;
  }

  async execute(alumnoId: number): Promise<AlumnoApoderado[]> {
    return await this.familiaRepository.listarPorAlumno(alumnoId);
  }
}
