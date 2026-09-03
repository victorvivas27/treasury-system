import type { User } from "@/core/A-domain/entities/user/User";

export interface LoginPayload {
  correo: string;
  password: string;
  organizationId?: number;
}

export interface LoginResponse {
  token: string | null;
  tokenType: "Bearer";
  expiresIn: number;
  csrfToken?: string;
  user: User | null;
  requiresOrganizationSelection?: boolean;
  organizationOptions?: LoginOrganizationOption[];
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export interface LoginOrganizationOption {
  id: number;
  name: string;
  slug?: string;
}

export interface AuthMessageResponse {
  message: string;
  requiresOrganizationSelection?: boolean;
  organizationOptions?: LoginOrganizationOption[];
}
