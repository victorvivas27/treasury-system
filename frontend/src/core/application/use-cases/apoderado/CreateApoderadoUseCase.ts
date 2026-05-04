import type { Apoderado, CreateApoderadoDTO } from "@/core/domain/entities/apoderado/Apoderado";
import type { IApoderadoRepository } from "@/core/domain/repository/apoderado/IApoderadoRepository";

export class CreateApoderadoUseCase {
  private readonly apoderadoRepository: IApoderadoRepository;

  constructor(apoderadoRepository: IApoderadoRepository) {
    this.apoderadoRepository = apoderadoRepository;
  }

  async execute(apoderadoData: CreateApoderadoDTO): Promise<Apoderado> {
    return await this.apoderadoRepository.create(apoderadoData);
  }
}
