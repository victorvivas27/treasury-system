import type {
  AdminImprovementSuggestion,
  ImprovementAdminFilters,
  ImprovementAdminSummary,
  ImprovementSuggestion,
  ImprovementSuggestionHistory,
  ImprovementSuggestionNote,
  ImprovementSuggestionPayload,
  ImprovementPriority,
  ImprovementStatus,
  PageResponse,
} from
  "@/core/A-domain/entities/improvement/ImprovementSuggestion";

export interface IImprovementSuggestionRepository {
  create(payload: ImprovementSuggestionPayload): Promise<ImprovementSuggestion>;
  mine(): Promise<ImprovementSuggestion[]>;
  adminList(filters: ImprovementAdminFilters): Promise<PageResponse<AdminImprovementSuggestion>>;
  adminSummary(): Promise<ImprovementAdminSummary>;
  adminDetail(id: number): Promise<AdminImprovementSuggestion>;
  updateStatus(id: number, status: ImprovementStatus): Promise<AdminImprovementSuggestion>;
  updatePriority(id: number, priority: ImprovementPriority): Promise<AdminImprovementSuggestion>;
  notes(id: number): Promise<ImprovementSuggestionNote[]>;
  addNote(id: number, content: string): Promise<ImprovementSuggestionNote>;
  history(id: number): Promise<ImprovementSuggestionHistory[]>;
  relate(id: number, relatedSuggestionId: number): Promise<AdminImprovementSuggestion>;
  deleteAdmin(id: number): Promise<void>;
}
