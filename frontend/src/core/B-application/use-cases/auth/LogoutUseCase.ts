import type { IAuthRepository } from "@/core/A-domain/repository/auth/IAuthRepository";

export class LogoutUseCase {
  private readonly repository: IAuthRepository;

  constructor(repository: IAuthRepository) {
    this.repository = repository;
  }

  execute() {
    return this.repository.logout();
  }
}
