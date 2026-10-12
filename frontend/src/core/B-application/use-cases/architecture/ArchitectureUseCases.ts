import type { IArchitectureRepository } from "@/core/A-domain/repository/architecture/IArchitectureRepository";

export class ArchitectureUseCases {
  private readonly repository: IArchitectureRepository;
  constructor(repository: IArchitectureRepository) { this.repository = repository; }

  canAccess(signal?: AbortSignal) { return this.repository.canAccess(signal); }
  catalog(signal?: AbortSignal) { return this.repository.catalog(signal); }
  diagram(id: string, signal?: AbortSignal) { return this.repository.diagram(id, signal); }
}
