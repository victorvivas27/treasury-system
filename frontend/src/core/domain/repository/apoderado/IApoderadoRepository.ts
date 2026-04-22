import type {Apoderado} from "@/core/domain/entities/apoderado/Apoderado";
export interface IApoderadoRepository {
  getAll(): Promise<Apoderado[]>;
  getById(id: string): Promise<Apoderado | null>;
  create(apoderado: Omit<Apoderado, 'id'>): Promise<Apoderado>;
  update(id: string, apoderado: Partial<Apoderado>): Promise<Apoderado>;
  delete(id: string): Promise<void>;
}
