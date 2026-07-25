import type { IAuthRepository } from "@/core/A-domain/repository/auth/IAuthRepository";

export class GetCurrentUserUseCase {
  private readonly repository: IAuthRepository;

  constructor(repository: IAuthRepository) {
    this.repository = repository;
  }

  execute() {
    return this.repository.me();
  }
}
