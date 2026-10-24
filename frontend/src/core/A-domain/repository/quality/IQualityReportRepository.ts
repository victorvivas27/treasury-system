import type { QualityReportCatalog } from "../../entities/quality/QualityReport";
export interface IQualityReportRepository {
  catalog(signal?: AbortSignal): Promise<QualityReportCatalog>;
  content(id: string, signal?: AbortSignal): Promise<string>;
}
