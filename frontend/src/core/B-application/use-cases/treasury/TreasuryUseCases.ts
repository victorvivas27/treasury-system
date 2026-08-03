import type { AnnualFeeConfigPayload, PaymentMode, TreasuryFilters,
  TreasuryReportType } from "@/core/A-domain/entities/treasury/Treasury";
import type { ITreasuryRepository } from "@/core/A-domain/repository/treasury/ITreasuryRepository";

export class TreasuryUseCases {
  private readonly repository: ITreasuryRepository;

  constructor(repository: ITreasuryRepository) {
    this.repository = repository;
  }
  listConfigs() { return this.repository.listConfigs(); }
  saveConfig(year: number, payload: AnnualFeeConfigPayload) {
    return this.repository.saveConfig(year, payload);
  }
  listPlans(year: number) { return this.repository.listPlans(year); }
  assignMode(year: number, familyId: number, mode: PaymentMode) {
    return this.repository.assignMode(year, familyId, mode);
  }
  removeFamilyPlan(year: number, familyId: number, reason: string) {
    return this.repository.removeFamilyPlan(year, familyId, reason);
  }
  generate(year: number) { return this.repository.generate(year); }
  listObligations(year: number, filters?: TreasuryFilters) {
    return this.repository.listObligations(year, filters);
  }
  pay(id: number, date: string, amount: number, observations?: string) {
    return this.repository.pay(id, date, amount, observations);
  }
  annul(id: number, reason: string) { return this.repository.annul(id, reason); }
  dashboard(year: number) { return this.repository.dashboard(year); }
  reports(year: number, type: TreasuryReportType) {
    return this.repository.reports(year, type);
  }
  profile(year: number) { return this.repository.profile(year); }
  listContributionConfigs(year: number) {
    return this.repository.listContributionConfigs(year);
  }
  listContributions(year: number) {
    return this.repository.listContributions(year);
  }
}
