import type { LoginPayload, LoginResponse } from "@/core/A-domain/entities/auth/Auth";
import type { User, UserPayload } from "@/core/A-domain/entities/user/User";

export interface IAuthRepository {
  login(payload: LoginPayload): Promise<LoginResponse>;
  register(payload: UserPayload): Promise<User>;
  me(): Promise<User>;
  refresh(): Promise<LoginResponse>;
  logout(): Promise<void>;
}
