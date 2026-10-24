import type { IQualityReportRepository } from "@/core/A-domain/repository/quality/IQualityReportRepository";
export class QualityReportUseCases {
  private readonly repository: IQualityReportRepository;
  constructor(repository: IQualityReportRepository) { this.repository = repository; }
  catalog(signal?: AbortSignal) { return this.repository.catalog(signal); }
  content(id: string, signal?: AbortSignal) { return this.repository.content(id, signal); }
}
