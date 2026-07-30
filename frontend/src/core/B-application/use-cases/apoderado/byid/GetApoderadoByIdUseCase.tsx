import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import type { IApoderadoRepository } from "@/core/A-domain/repository/apoderado/IApoderadoRepository";

 export class GetApoderadoByIdUseCase {
  private readonly apoderadoRepository: IApoderadoRepository;

  constructor(apoderadoRepository: IApoderadoRepository) {
    this.apoderadoRepository = apoderadoRepository;
  }

  async execute(codigo: string): Promise<Apoderado | null> {
    try {
      const apoderado = await this.apoderadoRepository.getById(codigo);
      return apoderado;
    } catch (error) {
      throw new Error(`Error al obtener el apoderado con codigo: ${codigo}`, { cause: error });
    }
  }
}
