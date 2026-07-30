import type { CreateFamiliaDTO, Familia } from "@/core/A-domain/entities/familia/Familia";
import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class CreateFamiliaUseCase {
  private readonly familiaRepository: IFamiliaRepository;

  constructor(familiaRepository: IFamiliaRepository) {
    this.familiaRepository = familiaRepository;
  }

  async execute(familia: CreateFamiliaDTO): Promise<Familia> {
    return await this.familiaRepository.create(familia);
  }
}
