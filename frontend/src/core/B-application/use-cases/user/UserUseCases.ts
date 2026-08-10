import type { UserPayload, UserRole } from "@/core/A-domain/entities/user/User";
import type { IUserRepository } from "@/core/A-domain/repository/user/IUserRepository";

export class ListUsersUseCase {
  private readonly repository: IUserRepository;
  constructor(repository: IUserRepository) {
    this.repository = repository;
  }
  execute(page: number, size: number, search = "") {
    return this.repository.getAll(page, size, search);
  }
}

export class CreateUserUseCase {
  private readonly repository: IUserRepository;
  constructor(repository: IUserRepository) {
    this.repository = repository;
  }
  execute(payload: UserPayload) {
    return this.repository.create(payload);
  }
}

export class UpdateUserUseCase {
  private readonly repository: IUserRepository;
  constructor(repository: IUserRepository) {
    this.repository = repository;
  }
  execute(id: number, payload: UserPayload) {
    return this.repository.update(id, payload);
  }
}

export class ChangeUserRoleUseCase {
  private readonly repository: IUserRepository;
  constructor(repository: IUserRepository) {
    this.repository = repository;
  }
  execute(id: number, rol: UserRole) {
    return this.repository.changeRole(id, rol);
  }
}

export class DeleteUserUseCase {
  private readonly repository: IUserRepository;
  constructor(repository: IUserRepository) {
    this.repository = repository;
  }
  execute(id: number) {
    return this.repository.delete(id);
  }
}
