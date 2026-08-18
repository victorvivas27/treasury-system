import type { PageResponse, User, UserPayload, UserRole } from "@/core/A-domain/entities/user/User";

export interface IUserRepository {
  getAll(page: number, size: number, search?: string): Promise<PageResponse<User>>;
  getById(id: number): Promise<User>;
  getByCode(code: string): Promise<User>;
  getByEmail(email: string): Promise<User>;
  create(payload: UserPayload): Promise<User>;
  update(id: number, payload: UserPayload): Promise<User>;
  changeRole(id: number, rol: UserRole): Promise<User>;
  delete(id: number): Promise<void>;
  selectAvatar(avatar: string): Promise<User>;
  uploadProfileImage(file: File, onProgress?: (percentage: number) => void): Promise<User>;
  resetProfileImage(): Promise<User>;
  getProfileImage(version?: string): Promise<Blob>;
}
