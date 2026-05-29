import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class DeleteAlumnoApoderadoUseCase {
  private readonly familiaRepository: IFamiliaRepository;

  constructor(familiaRepository: IFamiliaRepository) {
    this.familiaRepository = familiaRepository;
  }

  async execute(id: number): Promise<void> {
    return await this.familiaRepository.delete(id);
  }
}
