import { apiClient } from "@/core/D-config/api";
import type {
  CreateFamiliaDTO,
  Familia,
  FamiliaDetalle,
  PageResponse,
  UpdateFamiliaDTO,
} from "@/core/A-domain/entities/familia/Familia";
import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class FamiliaRepositoryImpl implements IFamiliaRepository {
  private readonly familiasBaseUrl = "/familias";

  async getAll(page: number, size: number): Promise<PageResponse<FamiliaDetalle>> {
    const response = await apiClient.get<PageResponse<FamiliaDetalle>>(this.familiasBaseUrl, {
      params: { page, size },
    });
    return response.data;
  }

  async getById(familiaId: number): Promise<FamiliaDetalle> {
    const response = await apiClient.get<FamiliaDetalle>(`${this.familiasBaseUrl}/${familiaId}`);
    return response.data;
  }

  async create(familia: CreateFamiliaDTO): Promise<Familia> {
    const response = await apiClient.post<Familia>(this.familiasBaseUrl, familia);
    return response.data;
  }

  async update(familiaId: number, familia: UpdateFamiliaDTO): Promise<Familia> {
    const response = await apiClient.put<Familia>(`${this.familiasBaseUrl}/${familiaId}`, familia);
    return response.data;
  }

  async delete(familiaId: number): Promise<void> {
    await apiClient.delete(`${this.familiasBaseUrl}/${familiaId}`);
  }
}
