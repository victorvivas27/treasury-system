import type { QualityReportCatalog } from "@/core/A-domain/entities/quality/QualityReport";
import type { IQualityReportRepository } from "@/core/A-domain/repository/quality/IQualityReportRepository";
import { apiClient } from "@/core/D-config/api";
export class QualityReportRepositoryImpl implements IQualityReportRepository {
  async catalog(signal?: AbortSignal): Promise<QualityReportCatalog> {
    return (await apiClient.get<QualityReportCatalog>("/admin/quality-reports", { signal })).data;
  }
  async content(id: string, signal?: AbortSignal): Promise<string> {
    return (await apiClient.get<string>(`/admin/quality-reports/${encodeURIComponent(id)}/content`, {
      responseType: "text", signal,
    })).data;
  }
}
