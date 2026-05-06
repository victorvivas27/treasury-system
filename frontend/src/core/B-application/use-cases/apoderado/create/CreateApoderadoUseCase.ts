import type { Apoderado, CreateApoderadoDTO } from "@/core/A-domain/entities/apoderado/Apoderado";
import type { IApoderadoRepository } from "@/core/A-domain/repository/apoderado/IApoderadoRepository";

export class CreateApoderadoUseCase {
  private readonly apoderadoRepository: IApoderadoRepository;

  constructor(apoderadoRepository: IApoderadoRepository) {
    this.apoderadoRepository = apoderadoRepository;
  }

  async execute(apoderadoData: CreateApoderadoDTO): Promise<Apoderado> {
    return await this.apoderadoRepository.create(apoderadoData);
  }
}
