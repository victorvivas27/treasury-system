import type { LoginPayload, LoginResponse } from "@/core/A-domain/entities/auth/Auth";
import type { User, UserPayload } from "@/core/A-domain/entities/user/User";
import type { IAuthRepository } from "@/core/A-domain/repository/auth/IAuthRepository";
import { apiClient } from "@/core/D-config/api";
import { AUTH_TOKEN_KEY } from "@/core/D-config/axiosInterceptor";

export class AuthRepositoryImpl implements IAuthRepository {
  private readonly baseUrl = "/auth";

  async login(payload: LoginPayload): Promise<LoginResponse> {
    return (await apiClient.post<LoginResponse>(`${this.baseUrl}/login`, payload, {
      // Cloud Run y la base de datos pueden necesitar unos segundos extra en el primer acceso.
      timeout: 30000,
    })).data;
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
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    await apiClient.post(`${this.baseUrl}/logout`, undefined, {
      // El cierre local no debe depender de la disponibilidad del servidor.
      timeout: 2500,
      ...(token && { headers: { Authorization: `Bearer ${token}` } }),
    });
  }

  async verifyEmail(token: string): Promise<LoginResponse> {
    return (await apiClient.post<LoginResponse>(`${this.baseUrl}/verify-email`, { token })).data;
  }

  async resendVerification(email: string): Promise<string> {
    return (await apiClient.post<{ message: string }>(`${this.baseUrl}/resend-verification`, { email }))
      .data.message;
  }

  async forgotPassword(email: string): Promise<string> {
    return (await apiClient.post<{ message: string }>(`${this.baseUrl}/forgot-password`, { email }))
      .data.message;
  }

  async resetPassword(token: string, newPassword: string): Promise<string> {
    return (await apiClient.post<{ message: string }>(`${this.baseUrl}/reset-password`,
      { token, newPassword })).data.message;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    return (await apiClient.patch<{ message: string }>(`${this.baseUrl}/change-password`,
      { currentPassword, newPassword })).data.message;
  }

}
