import { apiClient } from "@/core/config/api";
import type { Apoderado, CreateApoderadoDTO } from "@/core/domain/entities/apoderado/Apoderado";
import type { IApoderadoRepository } from "@/core/domain/repository/apoderado/IApoderadoRepository";

export class ApoderadoRepositoryImpl implements IApoderadoRepository {
  private readonly baseUrl = '/apoderados';

  async getAll(): Promise<Apoderado[]> {
    const response = await apiClient.get<Apoderado[]>(this.baseUrl);
    return response.data;
  }

  async getById(id: string): Promise<Apoderado | null> {
    const response = await apiClient.get<Apoderado>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async create(apoderado: CreateApoderadoDTO): Promise<Apoderado> {
    const response = await apiClient.post<Apoderado>(this.baseUrl, apoderado);
    return response.data;
  }

  async update(id: string, apoderado: Partial<Apoderado>): Promise<Apoderado> {
    const response = await apiClient.put<Apoderado>(`${this.baseUrl}/${id}`, apoderado);
    return response.data;
  }

  async delete(id:number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }
}
