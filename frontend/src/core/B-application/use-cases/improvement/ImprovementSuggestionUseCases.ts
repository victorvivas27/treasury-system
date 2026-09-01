import type { ImprovementAdminFilters, ImprovementPriority, ImprovementStatus,
  ImprovementSuggestionPayload } from
  "@/core/A-domain/entities/improvement/ImprovementSuggestion";
import type { IImprovementSuggestionRepository } from
  "@/core/A-domain/repository/improvement/IImprovementSuggestionRepository";

export class ImprovementSuggestionUseCases {
  private readonly repository: IImprovementSuggestionRepository;

  constructor(repository: IImprovementSuggestionRepository) {
    this.repository = repository;
  }

  create(payload: ImprovementSuggestionPayload) {
    return this.repository.create(payload);
  }

  mine() {
    return this.repository.mine();
  }

  adminList(filters: ImprovementAdminFilters) {
    return this.repository.adminList(filters);
  }

  adminSummary() {
    return this.repository.adminSummary();
  }

  adminDetail(id: number) {
    return this.repository.adminDetail(id);
  }

  updateStatus(id: number, status: ImprovementStatus) {
    return this.repository.updateStatus(id, status);
  }

  updatePriority(id: number, priority: ImprovementPriority) {
    return this.repository.updatePriority(id, priority);
  }

  notes(id: number) {
    return this.repository.notes(id);
  }

  addNote(id: number, content: string) {
    return this.repository.addNote(id, content);
  }

  history(id: number) {
    return this.repository.history(id);
  }

  relate(id: number, relatedSuggestionId: number) {
    return this.repository.relate(id, relatedSuggestionId);
  }

  deleteAdmin(id: number) {
    return this.repository.deleteAdmin(id);
  }
}
