import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import type { IApoderadoRepository } from "@/core/A-domain/repository/apoderado/IApoderadoRepository";

export class UpdateApoderadoUseCase {
  private readonly apoderadoRepository: IApoderadoRepository;

  constructor(apoderadoRepository: IApoderadoRepository) {
    this.apoderadoRepository = apoderadoRepository;
  }

  async execute(id: number, datosActualizados: Partial<Apoderado>): Promise<Apoderado> {

      const apoderado = await this.apoderadoRepository.update(id, datosActualizados);
      return apoderado;

  }
}
