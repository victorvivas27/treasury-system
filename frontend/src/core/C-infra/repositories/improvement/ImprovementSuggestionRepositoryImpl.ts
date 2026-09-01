import type {
  AdminImprovementSuggestion,
  ImprovementAdminFilters,
  ImprovementAdminSummary,
  ImprovementPriority,
  ImprovementStatus,
  ImprovementSuggestion,
  ImprovementSuggestionHistory,
  ImprovementSuggestionNote,
  ImprovementSuggestionPayload,
  PageResponse,
} from
  "@/core/A-domain/entities/improvement/ImprovementSuggestion";
import type { IImprovementSuggestionRepository } from
  "@/core/A-domain/repository/improvement/IImprovementSuggestionRepository";
import { apiClient } from "@/core/D-config/api";

export class ImprovementSuggestionRepositoryImpl implements IImprovementSuggestionRepository {
  async create(payload: ImprovementSuggestionPayload): Promise<ImprovementSuggestion> {
    const form = new FormData();
    const { screenshot, ...suggestion } = payload;
    form.append("suggestion", new Blob([JSON.stringify(suggestion)], { type: "application/json" }));
    if (screenshot) form.append("screenshot", screenshot);
    return (await apiClient.post<ImprovementSuggestion>("/improvements", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })).data;
  }

  async mine(): Promise<ImprovementSuggestion[]> {
    return (await apiClient.get<ImprovementSuggestion[]>("/improvements/mine")).data;
  }

  async adminList(filters: ImprovementAdminFilters): Promise<PageResponse<AdminImprovementSuggestion>> {
    const params = Object.fromEntries(Object.entries(filters)
      .filter(([, value]) => value !== "" && value !== undefined && value !== null));
    return (await apiClient.get<PageResponse<AdminImprovementSuggestion>>(
      "/admin/improvements", { params })).data;
  }

  async adminSummary(): Promise<ImprovementAdminSummary> {
    return (await apiClient.get<ImprovementAdminSummary>("/admin/improvements/summary")).data;
  }

  async adminDetail(id: number): Promise<AdminImprovementSuggestion> {
    return (await apiClient.get<AdminImprovementSuggestion>(`/admin/improvements/${id}`)).data;
  }

  async updateStatus(id: number, status: ImprovementStatus): Promise<AdminImprovementSuggestion> {
    return (await apiClient.patch<AdminImprovementSuggestion>(
      `/admin/improvements/${id}/status`, { status })).data;
  }

  async updatePriority(id: number, priority: ImprovementPriority): Promise<AdminImprovementSuggestion> {
    return (await apiClient.patch<AdminImprovementSuggestion>(
      `/admin/improvements/${id}/priority`, { priority })).data;
  }

  async notes(id: number): Promise<ImprovementSuggestionNote[]> {
    return (await apiClient.get<ImprovementSuggestionNote[]>(`/admin/improvements/${id}/notes`)).data;
  }

  async addNote(id: number, content: string): Promise<ImprovementSuggestionNote> {
    return (await apiClient.post<ImprovementSuggestionNote>(
      `/admin/improvements/${id}/notes`, { content })).data;
  }

  async history(id: number): Promise<ImprovementSuggestionHistory[]> {
    return (await apiClient.get<ImprovementSuggestionHistory[]>(`/admin/improvements/${id}/history`)).data;
  }

  async relate(id: number, relatedSuggestionId: number): Promise<AdminImprovementSuggestion> {
    return (await apiClient.post<AdminImprovementSuggestion>(
      `/admin/improvements/${id}/relations`, { relatedSuggestionId })).data;
  }

  async deleteAdmin(id: number): Promise<void> {
    await apiClient.delete(`/admin/improvements/${id}`);
  }
}
