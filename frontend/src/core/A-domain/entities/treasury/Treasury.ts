export type PaymentMode = "ANUAL" | "DOS_CUOTAS";
export type AllowedPaymentMode = PaymentMode | "AMBAS";
export type ObligationStatus = "PENDIENTE" | "PAGADA";
export type InstallmentType = "ANUAL" | "PRIMERA" | "SEGUNDA";

export interface AnnualFeeConfig {
  id: number;
  year: number;
  annualAmount: number;
  allowedMode: AllowedPaymentMode;
  annualDueDate: string;
  firstDueDate: string;
  secondDueDate: string;
}

export type AnnualFeeConfigPayload = Omit<AnnualFeeConfig, "id" | "year">;

export interface FamilyPlan {
  id: number;
  familyId: number;
  familyCode: string;
  primaryGuardian: string;
  studentName: string;
  course: string;
  mode: PaymentMode;
}

export interface FeeObligation {
  id: number;
  familyId: number;
  familyCode: string;
  primaryGuardian: string;
  studentName: string;
  course: string;
  mode: PaymentMode;
  installment: InstallmentType;
  concept: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: ObligationStatus;
}

export interface TreasuryDashboard {
  totalFamilies: number;
  annualFamilies: number;
  twoInstallmentFamilies: number;
  pendingObligations: number;
  paidObligations: number;
  collectedAmount: number;
  pendingAmount: number;
}

export interface TreasuryDashboardOverview {
  quotas: TreasuryDashboard;
  finances: FinancialSummary;
  monthlyCashFlow: Array<{ month: number; income: number; expense: number }>;
  obligationStatus: Array<{ status: "PAGADA" | "PENDIENTE"; count: number }>;
  expensesByCategory: Array<{ category: ExpenseCategory; amount: number }>;
  expensesByDescription: Array<{
    id: number;
    description: string;
    category: ExpenseCategory;
    amount: number;
  }>;
  recentMovements: Array<{
    id: number;
    type: "INGRESO" | "EGRESO" | "CUOTA";
    description: string;
    amount: number;
    date: string;
    status: IncomeStatus | ExpenseStatus;
  }>;
  auditTrail: Array<{
    id: number;
    action: string;
    entityType: string;
    entityId: string;
    performedBy: string;
    details?: string;
    createdAt: string;
  }>;
}

export interface TreasuryFilters {
  course?: string;
  familyId?: number;
  mode?: PaymentMode;
  status?: ObligationStatus;
}

export interface TreasuryReport {
  familyId: number;
  familyCode: string;
  primaryGuardian?: string;
  studentName: string;
  course: string;
  mode: PaymentMode;
  obligations: FeeObligation[];
}

export interface TreasuryProfile {
  familyId?: number;
  familyCode?: string;
  studentName?: string;
  studentMessage?: string;
  guardianPhone?: string;
  relationship?: string;
  primaryGuardian: boolean;
  mode?: PaymentMode;
  obligations: FeeObligation[];
  cepa?: ContributionPayment;
  solidarity?: ContributionPayment;
}

export type TreasuryReportType =
  | "AL_DIA"
  | "DEUDA"
  | "ANUAL_PAGADA"
  | "PRIMERA_PAGADA"
  | "SEGUNDA_PENDIENTE";

export type ContributionType = "CEPA" | "SOLIDARIA";
export type ContributionStatus = "PENDING" | "PAID" | "CANCELLED";

export interface ContributionConfig {
  id: number;
  schoolYear: number;
  type: ContributionType;
  name: string;
  active: boolean;
  referenceAmount?: number;
  observations?: string;
}

export interface ContributionPayment {
  id: number;
  status: ContributionStatus;
  paymentDate?: string;
  amount?: number;
  registeredBy?: string;
  notes?: string;
  cancelledAt?: string;
}

export interface FamilyContribution {
  familyId: number;
  familyCode: string;
  studentName: string;
  course: string;
  primaryGuardian?: string;
  cepa?: ContributionPayment;
  solidarity?: ContributionPayment;
}

export interface ContributionSummary {
  totalFamilies: number;
  cepaPaid: number;
  cepaPending: number;
  solidarityPaid: number;
  solidarityPending: number;
  fullyPaid: number;
  withPending: number;
}

export interface ContributionFilters {
  course?: string;
  cepaStatus?: "PAID" | "PENDING";
  solidarityStatus?: "PAID" | "PENDING";
  search?: string;
}

export type ExpenseStatus = "ACTIVE" | "CANCELLED";
export type ExpenseCategory =
  | "MATERIALS" | "SERVICES" | "EVENTS" | "REPAIRS" | "TRANSPORT"
  | "FOOD" | "DECORATION" | "PRIZES" | "ADMINISTRATION" | "OTHER";
export type ExpensePaymentMethod = "CASH" | "TRANSFER" | "CARD" | "OTHER";

export interface TreasuryExpense {
  id: number;
  schoolYear: number;
  description: string;
  amount: number;
  expenseDate: string;
  category: ExpenseCategory;
  paymentMethod?: ExpensePaymentMethod;
  recipient?: string;
  receiptNumber?: string;
  notes?: string;
  status: ExpenseStatus;
  registeredBy: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpensePayload = Omit<TreasuryExpense,
  "id" | "status" | "registeredBy" | "cancelledAt" | "cancelledBy"
  | "cancellationReason" | "createdAt" | "updatedAt"> & { correctionReason?: string };

export interface ExpenseFilters {
  month?: number;
  dateFrom?: string;
  dateTo?: string;
  category?: ExpenseCategory;
  paymentMethod?: ExpensePaymentMethod;
  status?: ExpenseStatus;
  registeredBy?: string;
  search?: string;
  sort?: "DATE_DESC" | "DATE_ASC" | "AMOUNT_DESC" | "AMOUNT_ASC"
    | "DESCRIPTION" | "CATEGORY";
}

export interface FinancialSummary {
  schoolYear: number;
  feeIncome: number;
  otherIncome: number;
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
}

export type IncomeStatus = "ACTIVE" | "CANCELLED";
export type IncomeCategory =
  | "RAFFLE" | "BINGO" | "DONATION" | "SALE" | "EVENT" | "SCHOOL_ACTIVITY"
  | "VOLUNTARY_CONTRIBUTION" | "GRANT" | "REFUND" | "INTEREST" | "OTHER";
export type IncomePaymentMethod = "CASH" | "TRANSFER" | "DEPOSIT" | "CARD" | "OTHER";

export interface TreasuryIncome {
  id: number;
  schoolYear: number;
  description: string;
  amount: number;
  incomeDate: string;
  category: IncomeCategory;
  source?: string;
  paymentMethod?: IncomePaymentMethod;
  receiptNumber?: string;
  course?: string;
  familyId?: number;
  notes?: string;
  status: IncomeStatus;
  registeredBy: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type IncomePayload = Omit<TreasuryIncome,
  "id" | "status" | "registeredBy" | "cancelledAt" | "cancelledBy"
  | "cancellationReason" | "createdAt" | "updatedAt"> & { correctionReason?: string };

export interface IncomeFilters {
  month?: number;
  dateFrom?: string;
  dateTo?: string;
  category?: IncomeCategory;
  course?: string;
  familyId?: number;
  paymentMethod?: IncomePaymentMethod;
  status?: IncomeStatus;
  registeredBy?: string;
  search?: string;
  sort?: "DATE_DESC" | "DATE_ASC" | "AMOUNT_DESC" | "AMOUNT_ASC"
    | "DESCRIPTION" | "CATEGORY";
}

export type SchoolEventStatus =
  | "BORRADOR" | "EN_PREPARACION" | "REALIZADO" | "EN_LIQUIDACION"
  | "CERRADO" | "CANCELADO";
export type EventExpenseType = "COMMON" | "COURSE";
export type EventTransferStatus =
  | "PENDING" | "TRANSFERRED" | "CANCELLED" | "REQUIRES_RESOLUTION";

export interface SchoolEventParticipant {
  course: string;
  standName: string;
  standType?: string;
  description?: string;
  responsible?: string;
  observations?: string;
  grossShare?: number;
  ownExpenses?: number;
  netProfit?: number;
  transferStatus: EventTransferStatus;
}

export interface SchoolEventExpense {
  key: string;
  description: string;
  amount: number;
  date: string;
  type: EventExpenseType;
  course?: string;
  category?: string;
  responsible?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  observations?: string;
  deductFromSettlement: boolean;
  status: "ACTIVE" | "CANCELLED";
  registeredBy: string;
  cancellationReason?: string;
}

export interface SchoolEvent {
  id: number;
  name: string;
  schoolYear: number;
  eventDate: string;
  description?: string;
  status: SchoolEventStatus;
  observations?: string;
  participants: SchoolEventParticipant[];
  expenses: SchoolEventExpense[];
  grossRevenue?: number;
  revenueDate?: string;
  revenueDescription?: string;
  revenuePaymentMethod?: string;
  revenueReceipt?: string;
  revenueObservations?: string;
  commonExpenses: number;
  courseExpenses: number;
  netProfit: number;
  remainder?: number;
  settlementConfirmed: boolean;
}

export interface SchoolEventOption {
  id: number;
  name: string;
  eventDate: string;
}

export interface EventSettlement {
  grossRevenue: number;
  commonExpenses: number;
  distributable: number;
  grossShare: number;
  remainder: number;
  courses: Array<{
    course: string;
    grossShare: number;
    expenses: number;
    netProfit: number;
    transferStatus: EventTransferStatus;
  }>;
}
