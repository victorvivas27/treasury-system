import type { LoginPayload, LoginResponse } from "@/core/A-domain/entities/auth/Auth";
import type { IAuthRepository } from "@/core/A-domain/repository/auth/IAuthRepository";

export class LoginUseCase {
  private readonly repository: IAuthRepository;

  constructor(repository: IAuthRepository) {
    this.repository = repository;
  }

  execute(payload: LoginPayload): Promise<LoginResponse> {
    return this.repository.login(payload);
  }
}
