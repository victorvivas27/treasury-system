export interface CoverageMetric { covered: number; total: number; percent: number }
export interface QualityReport {
  id: string;
  application: string;
  suite: string;
  generatedAt: string;
  sha: string;
  releaseSha: string;
  workflowRunId: string;
  tests: { total: number; passed: number; failed: number; skipped: number };
  coverage: Record<string, CoverageMetric>;
}
export interface QualityReportCatalog { configured: boolean; reports: QualityReport[] }
