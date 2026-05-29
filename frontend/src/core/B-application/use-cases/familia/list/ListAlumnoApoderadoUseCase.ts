import type { FamiliaDetalle, PageResponse } from "@/core/A-domain/entities/familia/Familia";
import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class ListAlumnoApoderadoUseCase {
  private readonly familiaRepository: IFamiliaRepository;

  constructor(familiaRepository: IFamiliaRepository) {
    this.familiaRepository = familiaRepository;
  }

  async execute(page: number, size: number): Promise<PageResponse<FamiliaDetalle>> {
    return await this.familiaRepository.getAll(page, size);
  }
}
