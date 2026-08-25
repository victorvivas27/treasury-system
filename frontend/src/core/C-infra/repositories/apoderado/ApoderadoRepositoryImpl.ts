import { apiClient } from "@/core/D-config/api";
import type {
  Apoderado,
  CreateApoderadoDTO,
  PageResponse,
} from "@/core/A-domain/entities/apoderado/Apoderado";
import type { IApoderadoRepository } from "@/core/A-domain/repository/apoderado/IApoderadoRepository";

export class ApoderadoRepositoryImpl implements IApoderadoRepository {
  private readonly baseUrl = "/apoderados";

  async getAll(page: number , size: number, search = ""): Promise<PageResponse<Apoderado>> {
    const response = await apiClient.get<PageResponse<Apoderado>>(this.baseUrl, {
      params: { page, size, ...(search.trim() && { search: search.trim() }) }
    });
    return response.data;
  }

  async getById(codigo: string): Promise<Apoderado | null> {
    const response = await apiClient.get<Apoderado>(`${this.baseUrl}/${codigo}`);
    return response.data;
  }

  async create(apoderado: CreateApoderadoDTO): Promise<Apoderado> {
    const response = await apiClient.post<Apoderado>(this.baseUrl, apoderado);
    return response.data;
  }

  async update(codigo: string, apoderado: Partial<Apoderado>): Promise<Apoderado> {
    const response = await apiClient.put<Apoderado>(
      `${this.baseUrl}/${codigo}`,
      apoderado,
    );
    return response.data;
  }

  async delete(codigo: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${codigo}`);
  }

  async changeStatus(codigo: string, activo: boolean): Promise<Apoderado> {
    return (await apiClient.patch<Apoderado>(`${this.baseUrl}/${codigo}/estado`, { activo })).data;
  }

  async enableAccess(codigo: string, token?: string): Promise<Apoderado> {
    return (await apiClient.post<Apoderado>(
      `${this.baseUrl}/${codigo}/habilitar-acceso`, {}, {
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      })).data;
  }
}
