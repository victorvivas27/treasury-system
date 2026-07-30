import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class DeleteFamiliaUseCase {
  private readonly familiaRepository: IFamiliaRepository;

  constructor(familiaRepository: IFamiliaRepository) {
    this.familiaRepository = familiaRepository;
  }

  async execute(familiaId: number): Promise<void> {
    return await this.familiaRepository.delete(familiaId);
  }
}
