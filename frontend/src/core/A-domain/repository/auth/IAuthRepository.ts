import type { AuthMessageResponse, LoginPayload, LoginResponse } from "@/core/A-domain/entities/auth/Auth";
import type { User } from "@/core/A-domain/entities/user/User";

export interface IAuthRepository {
  login(payload: LoginPayload): Promise<LoginResponse>;
  me(): Promise<User>;
  refresh(): Promise<LoginResponse>;
  logout(): Promise<void>;
  verifyEmail(token: string): Promise<AuthMessageResponse>;
  resendVerification(email: string, organizationId?: number): Promise<string>;
  forgotPassword(email: string, organizationId?: number): Promise<AuthMessageResponse>;
  resetPassword(token: string, newPassword: string): Promise<string>;
  changePassword(currentPassword: string, newPassword: string): Promise<string>;
}
