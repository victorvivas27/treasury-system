import type { PageResponse, User, UserPayload, UserRole } from "@/core/A-domain/entities/user/User";
import type { IUserRepository } from "@/core/A-domain/repository/user/IUserRepository";
import { apiClient } from "@/core/D-config/api";

export class UserRepositoryImpl implements IUserRepository {
  private readonly baseUrl = "/users";

  async getAll(page: number, size: number, search = ""): Promise<PageResponse<User>> {
    const response = await apiClient.get<PageResponse<User>>(this.baseUrl, {
      params: { page, size, ...(search.trim() && { search: search.trim() }) },
    });
    return response.data;
  }

  async getById(id: number): Promise<User> {
    return (await apiClient.get<User>(`${this.baseUrl}/${id}`)).data;
  }

  async getByCode(code: string): Promise<User> {
    return (await apiClient.get<User>(`${this.baseUrl}/code/${code}`)).data;
  }

  async getByEmail(email: string): Promise<User> {
    return (await apiClient.get<User>(`${this.baseUrl}/email/${encodeURIComponent(email)}`)).data;
  }

  async create(payload: UserPayload): Promise<User> {
    return (await apiClient.post<User>(this.baseUrl, payload)).data;
  }

  async update(id: number, payload: UserPayload): Promise<User> {
    return (await apiClient.put<User>(`${this.baseUrl}/${id}`, payload)).data;
  }

  async changeRole(id: number, rol: UserRole): Promise<User> {
    return (await apiClient.patch<User>(`${this.baseUrl}/${id}/rol`, { rol })).data;
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async selectAvatar(avatar: string): Promise<User> {
    return (await apiClient.patch<User>(`${this.baseUrl}/me/avatar`, { avatar })).data;
  }

  async uploadProfileImage(file: File, onProgress?: (percentage: number) => void): Promise<User> {
    const data = new FormData();
    data.append("file", file);
    return (await apiClient.post<User>(`${this.baseUrl}/me/profile-image`, data, {
      headers: { "Content-Type": "multipart/form-data" },
      ...(onProgress && { onUploadProgress: (event: { loaded: number; total?: number }) => {
        if (!event.total) return;
        onProgress(Math.min(95, Math.round((event.loaded * 100) / event.total)));
      } }),
    })).data;
  }

  async resetProfileImage(): Promise<User> {
    return (await apiClient.delete<User>(`${this.baseUrl}/me/profile-image`)).data;
  }

  async getProfileImage(version?: string): Promise<Blob> {
    return (await apiClient.get(`${this.baseUrl}/me/profile-image/content`, {
      responseType: "blob",
      params: version ? { v: version } : undefined,
    })).data;
  }

  async getProfileImageByUserId(userId: number, version?: string): Promise<Blob> {
    return (await apiClient.get(`${this.baseUrl}/${userId}/profile-image/content`, {
      responseType: "blob",
      params: version ? { v: version } : undefined,
    })).data;
  }
}
