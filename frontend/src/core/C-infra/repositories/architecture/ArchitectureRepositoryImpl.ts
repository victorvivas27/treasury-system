import type { ArchitectureCatalog } from "@/core/A-domain/entities/architecture/Architecture";
import type { IArchitectureRepository } from "@/core/A-domain/repository/architecture/IArchitectureRepository";
import { apiClient } from "@/core/D-config/api";

export class ArchitectureRepositoryImpl implements IArchitectureRepository {
  private readonly baseUrl = "/admin/architecture";

  async canAccess(signal?: AbortSignal): Promise<boolean> {
    const response = await apiClient.get<{ allowed: boolean }>(`${this.baseUrl}/access`, { signal });
    return response.data.allowed === true;
  }

  async catalog(signal?: AbortSignal): Promise<ArchitectureCatalog> {
    return (await apiClient.get<ArchitectureCatalog>(this.baseUrl, { signal })).data;
  }

  async diagram(id: string, signal?: AbortSignal): Promise<string> {
    return (await apiClient.get<string>(`${this.baseUrl}/diagrams/${encodeURIComponent(id)}`, {
      responseType: "text", signal,
    })).data;
  }
}
