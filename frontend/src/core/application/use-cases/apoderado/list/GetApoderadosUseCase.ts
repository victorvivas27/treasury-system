import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";
import type { IApoderadoRepository } from "@/core/domain/repository/apoderado/IApoderadoRepository";

export class GetApoderadosUseCase {
  private readonly apoderadoRepository: IApoderadoRepository;
  constructor(apoderadoRepository: IApoderadoRepository) {

    this.apoderadoRepository = apoderadoRepository;
  }

  async execute(): Promise<Apoderado[]> {
    try {
      const apoderados = await this.apoderadoRepository.getAll();
      return apoderados;
    } catch (error) {
      throw new Error('No se pudieron obtener los apoderados', { cause: error });
    }
  }
}
