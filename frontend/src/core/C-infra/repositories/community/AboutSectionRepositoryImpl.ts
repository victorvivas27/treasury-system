import type { AboutSectionPayload } from "@/core/A-domain/entities/community/AboutSection";
import type { IAboutSectionRepository } from "@/core/A-domain/repository/community/IAboutSectionRepository";
import { apiClient } from "@/core/D-config/api";

export class AboutSectionRepositoryImpl implements IAboutSectionRepository {
  private readonly baseUrl = "/community/about";
  async publicList() { return (await apiClient.get(this.baseUrl)).data; }
  async adminList() { return (await apiClient.get(`${this.baseUrl}/admin`)).data; }
  async create(payload: AboutSectionPayload) {
    return (await apiClient.post(this.baseUrl, payload)).data;
  }
  async update(id: number, payload: AboutSectionPayload) {
    return (await apiClient.put(`${this.baseUrl}/${id}`, payload)).data;
  }
  async delete(id: number) { await apiClient.delete(`${this.baseUrl}/${id}`); }
}
