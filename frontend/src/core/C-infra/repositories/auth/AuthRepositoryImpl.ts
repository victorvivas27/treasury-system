import type { LoginPayload, LoginResponse } from "@/core/A-domain/entities/auth/Auth";
import type { User, UserPayload } from "@/core/A-domain/entities/user/User";
import type { IAuthRepository } from "@/core/A-domain/repository/auth/IAuthRepository";
import { apiClient } from "@/core/D-config/api";

export class AuthRepositoryImpl implements IAuthRepository {
  private readonly baseUrl = "/auth";

  async login(payload: LoginPayload): Promise<LoginResponse> {
    return (await apiClient.post<LoginResponse>(`${this.baseUrl}/login`, payload)).data;
  }

  async register(payload: UserPayload): Promise<User> {
    return (await apiClient.post<User>(`${this.baseUrl}/register`, payload)).data;
  }

  async me(): Promise<User> {
    return (await apiClient.get<User>(`${this.baseUrl}/me`)).data;
  }

  async refresh(): Promise<LoginResponse> {
    return (await apiClient.post<LoginResponse>(`${this.baseUrl}/refresh`)).data;
  }

  async logout(): Promise<void> {
    await apiClient.post(`${this.baseUrl}/logout`);
  }

}
