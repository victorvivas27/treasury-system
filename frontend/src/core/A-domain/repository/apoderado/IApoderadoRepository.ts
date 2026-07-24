import type {Apoderado, CreateApoderadoDTO, PageResponse} from "@/core/A-domain/entities/apoderado/Apoderado";
export interface IApoderadoRepository {

  getAll(page: number, size: number): Promise<PageResponse<Apoderado>>;

  create(apoderado: CreateApoderadoDTO): Promise<Apoderado>;

  getById(codigo: string): Promise<Apoderado | null>;

  update(codigo: string, apoderado: Partial<Apoderado>): Promise<Apoderado>;

  delete(apoderadoId: number): Promise<void>;
}
