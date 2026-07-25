import type { PageResponse, User, UserPayload, UserRole } from "@/core/A-domain/entities/user/User";
import type { IUserRepository } from "@/core/A-domain/repository/user/IUserRepository";
import { apiClient } from "@/core/D-config/api";

export class UserRepositoryImpl implements IUserRepository {
  private readonly baseUrl = "/users";

  async getAll(page: number, size: number): Promise<PageResponse<User>> {
    const response = await apiClient.get<PageResponse<User>>(this.baseUrl, {
      params: { page, size },
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
}
