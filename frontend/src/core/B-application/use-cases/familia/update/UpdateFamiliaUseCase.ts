import type { Familia, UpdateFamiliaDTO } from "@/core/A-domain/entities/familia/Familia";
import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class UpdateFamiliaUseCase {
  private readonly familiaRepository: IFamiliaRepository;

  constructor(familiaRepository: IFamiliaRepository) {
    this.familiaRepository = familiaRepository;
  }

  async execute(familiaId: number, familia: UpdateFamiliaDTO): Promise<Familia> {
    return await this.familiaRepository.update(familiaId, familia);
  }
}
