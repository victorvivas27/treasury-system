import type {
  AllowedPaymentMode, AnnualFeeConfig, AnnualFeeConfigPayload, AssignModePayload, FamilyPlan,
  FeeObligation, ObligationStatus, TreasuryDashboard,
  TreasuryFilters, TreasuryReport, TreasuryReportType,
  TreasuryProfile,
  ContributionConfig, ContributionFilters, ContributionSummary, ContributionType,
  FamilyContribution,
  ExpenseDocument, ExpenseFilters, ExpensePayload, FinancialSummary, TreasuryExpense,
  IncomeFilters, IncomePayload, TreasuryIncome,
} from "@/core/A-domain/entities/treasury/Treasury";

export interface ITreasuryRepository {
  listConfigs(): Promise<AnnualFeeConfig[]>;
  saveConfig(year: number, payload: AnnualFeeConfigPayload): Promise<AnnualFeeConfig>;
  listPlans(year: number): Promise<FamilyPlan[]>;
  assignMode(year: number, familyId: number, payload: AssignModePayload): Promise<FamilyPlan>;
  removeFamilyPlan(year: number, familyId: number, reason: string): Promise<void>;
  generate(year: number): Promise<number>;
  listObligations(year: number, filters?: TreasuryFilters): Promise<FeeObligation[]>;
  pay(obligationId: number, paymentDate: string, amount: number,
    observations?: string): Promise<void>;
  annul(obligationId: number, reason: string): Promise<void>;
  dashboard(year: number): Promise<TreasuryDashboard>;
  reports(year: number, type: TreasuryReportType): Promise<TreasuryReport[]>;
  profile(year: number): Promise<TreasuryProfile>;
  listContributionConfigs(year: number): Promise<ContributionConfig[]>;
  saveContributionConfig(year: number, type: ContributionType,
    payload: Omit<ContributionConfig, "id" | "schoolYear" | "type">): Promise<ContributionConfig>;
  listContributions(year: number, filters?: ContributionFilters): Promise<FamilyContribution[]>;
  contributionSummary(year: number): Promise<ContributionSummary>;
  payContribution(familyId: number, schoolYear: number, contributionType: ContributionType,
    paymentDate: string, notes?: string): Promise<void>;
  cancelContribution(id: number, reason: string): Promise<void>;
  listExpenses(year: number, filters?: ExpenseFilters): Promise<TreasuryExpense[]>;
  getExpense(id: number): Promise<TreasuryExpense>;
  createExpense(payload: ExpensePayload): Promise<TreasuryExpense>;
  updateExpense(id: number, payload: ExpensePayload): Promise<TreasuryExpense>;
  cancelExpense(id: number, reason: string): Promise<TreasuryExpense>;
  listExpenseDocuments(expenseId: number): Promise<ExpenseDocument[]>;
  uploadExpenseDocuments(expenseId: number, files: File[]): Promise<ExpenseDocument[]>;
  getExpenseDocument(expenseId: number, documentId: number): Promise<Blob>;
  deleteExpenseDocument(expenseId: number, documentId: number): Promise<void>;
  financialSummary(year: number): Promise<FinancialSummary>;
  listIncomes(year: number, filters?: IncomeFilters): Promise<TreasuryIncome[]>;
  getIncome(id: number): Promise<TreasuryIncome>;
  createIncome(payload: IncomePayload): Promise<TreasuryIncome>;
  updateIncome(id: number, payload: IncomePayload): Promise<TreasuryIncome>;
  cancelIncome(id: number, reason: string): Promise<TreasuryIncome>;
  listIncomeDocuments(incomeId: number): Promise<ExpenseDocument[]>;
  uploadIncomeDocuments(incomeId: number, files: File[]): Promise<ExpenseDocument[]>;
  getIncomeDocument(incomeId: number, documentId: number): Promise<Blob>;
  deleteIncomeDocument(incomeId: number, documentId: number): Promise<void>;
}

export type { AllowedPaymentMode, ObligationStatus };
