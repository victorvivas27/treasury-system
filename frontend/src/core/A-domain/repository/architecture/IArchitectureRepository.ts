import type { ArchitectureCatalog } from "@/core/A-domain/entities/architecture/Architecture";

export interface IArchitectureRepository {
  canAccess(signal?: AbortSignal): Promise<boolean>;
  catalog(signal?: AbortSignal): Promise<ArchitectureCatalog>;
  diagram(id: string, signal?: AbortSignal): Promise<string>;
}
