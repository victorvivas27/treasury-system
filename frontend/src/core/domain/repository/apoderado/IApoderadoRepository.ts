import type {Apoderado, CreateApoderadoDTO} from "@/core/domain/entities/apoderado/Apoderado";
export interface IApoderadoRepository {
  getAll(): Promise<Apoderado[]>;

  create(apoderado: CreateApoderadoDTO): Promise<Apoderado>; // ← Nuevo método

  getById(id: string): Promise<Apoderado | null>;

  update(id: string, apoderado: Partial<Apoderado>): Promise<Apoderado>;

  delete(id: string): Promise<void>;
}
