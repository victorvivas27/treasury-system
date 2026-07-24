import type { FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class GetFamiliaUseCase {
  private readonly familiaRepository: IFamiliaRepository;

  constructor(familiaRepository: IFamiliaRepository) {
    this.familiaRepository = familiaRepository;
  }

  async execute(familiaId: number): Promise<FamiliaDetalle> {
    return await this.familiaRepository.getById(familiaId);
  }
}
