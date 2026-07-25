import type { User } from "@/core/A-domain/entities/user/User";

export interface LoginPayload {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: User;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}
