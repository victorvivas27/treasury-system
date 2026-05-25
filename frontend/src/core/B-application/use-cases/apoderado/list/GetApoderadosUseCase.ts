import type { Apoderado, PageResponse } from "@/core/A-domain/entities/apoderado/Apoderado";
import type { IApoderadoRepository } from "@/core/A-domain/repository/apoderado/IApoderadoRepository";

export class GetApoderadosUseCase {
  private readonly apoderadoRepository: IApoderadoRepository;

  constructor(apoderadoRepository: IApoderadoRepository) {
    this.apoderadoRepository = apoderadoRepository;
  }

  async execute(page: number, size: number): Promise<PageResponse<Apoderado>> {
    try {
      const response = await this.apoderadoRepository.getAll(page, size);
      return response;
    } catch (error) {
      throw new Error("No se pudieron obtener los apoderados", { cause: error });
    }
  }
}
