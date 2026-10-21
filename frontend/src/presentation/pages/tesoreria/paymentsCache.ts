import { apiClient } from "@/core/D-config/api";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { createDashboardResource } from "@/presentation/pages/dashboard/dashboardCache";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";

export const paymentsBase = "/tesoreria/pagos-transferencia";
const treasuryRepository = new TreasuryRepositoryImpl();
export type BankAccount = {
  id?: number;
  schoolYear: number;
  accountHolderName: string;
  accountHolderRut: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  email: string;
};
export type Payment = {
  paymentMethod?: string;
  providerPaymentId?: string;
  providerStatus?: string;
  createdAt?: string;
  id: number;
  amount: number;
  status: string;
  paidAt: string | null;
  originalFileName: string | null;
  submittedAt: string | null;
  rejectionReason: string | null;
};
type Installment = {
  installment?: string;
  id: number;
  concept: string;
  amount: number;
  dueDate: string;
  status: string;
  history: Payment[];
};
export type MyPayments = {
  schoolYear: number;
  annualAmount?: number | null;
  totalAmount: number;
  allowedMode: "ANUAL" | "DOS_CUOTAS" | "AMBAS";
  studentName: string;
  selectedMode: "ANUAL" | "DOS_CUOTAS" | "PERSONALIZADA" | null;
  paidAmount: number;
  installments: Installment[];
  bankAccount: BankAccount | null;
};
export type Review = {
  paymentMethod?: string;
  id: number;
  studentName: string;
  guardianName: string;
  installment: string;
  amount: number;
  status: string;
  submittedAt: string | null;
  rejectionReason: string | null;
};
export const resolveAnnualAmount = async (payments: MyPayments): Promise<MyPayments> => {
  if (typeof payments.annualAmount === "number" && Number.isFinite(payments.annualAmount)) return payments;
  const config = await treasuryRepository.getConfig(payments.schoolYear);
  if (config.year !== payments.schoolYear || typeof config.annualAmount !== "number" || !Number.isFinite(config.annualAmount)) {
    throw new Error("No fue posible consultar el monto de la configuración anual.");
  }
  return { ...payments, annualAmount: config.annualAmount };
};
export const emptyBank = (schoolYear: number): BankAccount => ({
  schoolYear,
  accountHolderName: "",
  accountHolderRut: "",
  bankName: "",
  accountType: "",
  accountNumber: "",
  email: "",
});

type PaymentData = { mine: MyPayments | null; bank: BankAccount; reviews: Review[] };
export class PaymentsLoadError extends Error {
  readonly partial: PaymentData;
  constructor(message: string, partial: PaymentData) { super(message); this.partial = partial; }
}
const resources = new Map<string, ReturnType<typeof createDashboardResource<PaymentData>>>();
const selections = new Map<string, { year: number; filter: string }>();
export const paymentsSelection = (accountId?: number, admin = false) => {
  const key = `${accountId ?? "anonymous"}:${admin}`;
  return { get: () => selections.get(key), set: (year: number, filter: string) => { selections.set(key, { year, filter }); } };
};
export const getPaymentsResource = (accountId: number | undefined, admin: boolean, year: number, filter = "") => {
  const key = `${accountId ?? "anonymous"}:${admin}:${year}:${admin ? filter : ""}`;
  if (!resources.has(key)) resources.set(key, createDashboardResource(async (): Promise<PaymentData> => {
    const bankRequest = apiClient.get<BankAccount>(`${paymentsBase}/cuenta-bancaria`, { params: { year } }).then(response => response.data);
    if (admin) {
      const [bankResult, reviewsResult] = await Promise.allSettled([
        bankRequest, apiClient.get<Review[]>(`${paymentsBase}/revision`, { params: { year, status: filter || undefined } }).then(response => response.data),
      ]);
      const partial = { mine: null, bank: bankResult.status === "fulfilled" ? bankResult.value : emptyBank(year),
        reviews: reviewsResult.status === "fulfilled" ? reviewsResult.value : [] };
      if (bankResult.status === "rejected" || reviewsResult.status === "rejected") {
        throw new PaymentsLoadError("No fue posible cargar todos los datos de pagos. Intenta nuevamente.", partial);
      }
      return partial;
    }
    const [bankResult, paymentsResult] = await Promise.allSettled([
      bankRequest, apiClient.get<MyPayments>(`${paymentsBase}/mis-pagos`, { params: { year } }).then(response => response.data),
    ]);
    const bank = bankResult.status === "fulfilled" ? bankResult.value : emptyBank(year);
    const partial = { mine: null, bank, reviews: [] };
    if (paymentsResult.status === "rejected") throw new PaymentsLoadError(paymentsLoadError(paymentsResult.reason), partial);
    try {
      const mine = await resolveAnnualAmount(paymentsResult.value);
      return { mine: { ...mine, bankAccount: bankResult.status === "fulfilled" ? bankResult.value : mine.bankAccount }, bank, reviews: [] };
    } catch {
      throw new PaymentsLoadError("La cuenta bancaria está disponible, pero falta configurar la cuota anual de este año.", partial);
    }
  }));
  return resources.get(key)!;
};
export const clearPaymentsCache = () => {
  resources.forEach(resource => resource.clear());
  resources.clear();
  selections.clear();
};
window.addEventListener(DASHBOARD_RESET, clearPaymentsCache);
apiClient.interceptors.response.use(response => {
  if (["post", "put", "patch", "delete"].includes(response.config.method ?? "")
    && /\/tesoreria\/(pagos-transferencia|pagos|configuracion|obligaciones|aportes)(\/|$)/.test(response.config.url ?? "")) {
    resources.forEach(resource => resource.invalidate());
  }
  return response;
});

export const paymentsLoadError = (reason: unknown) => {
  const fallback = "No fue posible cargar tus pagos. Intenta nuevamente.";
  if (typeof reason !== "object" || reason === null || !("response" in reason)) return fallback;
  const response = (reason as { response?: { status?: number; data?: { errors?: Record<string, unknown> } } }).response;
  if (!response) return "No pudimos conectar con el servidor para cargar tus pagos. Revisa la conexión e intenta nuevamente.";
  if (response.status === 401) return "Tu sesión no está disponible. Vuelve a iniciar sesión para consultar tus pagos.";
  if (response.status && response.status >= 400 && response.status < 500) {
    const messages = Object.values(response.data?.errors ?? {}).filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );
    if (messages.length) return messages.join(" ");
  }
  return fallback;
};

