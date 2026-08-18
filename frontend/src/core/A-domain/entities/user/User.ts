export type UserRole = "ADMIN" | "USER";
export type ProfileImageType = "INITIALS" | "PREDEFINED_AVATAR" | "CUSTOM_IMAGE";

export interface User {
  id: number;
  code: string;
  nombre: string;
  correo: string;
  rol: UserRole;
  enabled: boolean;
  accountNonLocked: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profileImageType: ProfileImageType;
  profileImageUrl: string | null;
}

export interface UserPayload {
  nombre: string;
  correo: string;
  password?: string;
  rol?: UserRole;
  enabled?: boolean;
  accountNonLocked?: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
