import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class DeleteFamiliaUseCase {
  private readonly familiaRepository: IFamiliaRepository;

  constructor(familiaRepository: IFamiliaRepository) {
    this.familiaRepository = familiaRepository;
  }

  async execute(alumnoId: number, apoderadoId: number): Promise<void> {
    return await this.familiaRepository.eliminar(alumnoId, apoderadoId);
  }
}
