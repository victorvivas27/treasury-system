import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";
import type { IApoderadoRepository } from "@/core/domain/repository/apoderado/IApoderadoRepository";

 export class GetApoderadoByIdUseCase {
  private readonly apoderadoRepository: IApoderadoRepository;

  constructor(apoderadoRepository: IApoderadoRepository) {
    this.apoderadoRepository = apoderadoRepository;
  }

  async execute(id:number): Promise<Apoderado | null> {
    try {
      const apoderado = await this.apoderadoRepository.getById(id);
      return apoderado;
    } catch (error) {
      throw new Error(`Error al obtener el apoderado con ID: ${id}`, { cause: error });
    }
  }
}
