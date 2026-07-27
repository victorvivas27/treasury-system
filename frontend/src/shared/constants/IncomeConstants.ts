import type { IncomeCategory, IncomePaymentMethod } from
  "@/core/A-domain/entities/treasury/Treasury";

export const INCOME_CATEGORIES: ReadonlyArray<{ value: IncomeCategory; label: string }> = [
  { value: "RAFFLE", label: "Rifa" }, { value: "BINGO", label: "Bingo" },
  { value: "DONATION", label: "Donación" }, { value: "SALE", label: "Venta" },
  { value: "EVENT", label: "Evento" },
  { value: "SCHOOL_ACTIVITY", label: "Actividad escolar" },
  { value: "VOLUNTARY_CONTRIBUTION", label: "Aporte voluntario" },
  { value: "GRANT", label: "Subvención" }, { value: "REFUND", label: "Devolución" },
  { value: "INTEREST", label: "Intereses" }, { value: "OTHER", label: "Otros" },
] as const;

export const INCOME_PAYMENT_METHODS:
ReadonlyArray<{ value: IncomePaymentMethod; label: string }> = [
  { value: "CASH", label: "Efectivo" }, { value: "TRANSFER", label: "Transferencia" },
  { value: "DEPOSIT", label: "Depósito" }, { value: "CARD", label: "Tarjeta" },
  { value: "OTHER", label: "Otro" },
] as const;

export const incomeCategoryLabel = (value: IncomeCategory) =>
  INCOME_CATEGORIES.find((item) => item.value === value)?.label ?? value;
export const incomePaymentLabel = (value?: IncomePaymentMethod) =>
  INCOME_PAYMENT_METHODS.find((item) => item.value === value)?.label ?? "No informado";
