import type {Apoderado, CreateApoderadoDTO, PageResponse} from "@/core/A-domain/entities/apoderado/Apoderado";
export interface IApoderadoRepository {

  getAll(page: number, size: number): Promise<PageResponse<Apoderado>>;

  create(apoderado: CreateApoderadoDTO): Promise<Apoderado>;

  getById(id:number): Promise<Apoderado | null>;

  update(id:number, apoderado: Partial<Apoderado>): Promise<Apoderado>;

  delete(id: number): Promise<void>;
}
