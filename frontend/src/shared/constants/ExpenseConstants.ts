import type { ExpenseCategory, ExpensePaymentMethod } from
  "@/core/A-domain/entities/treasury/Treasury";

export const EXPENSE_CATEGORIES: ReadonlyArray<{ value: ExpenseCategory; label: string }> = [
  { value: "MATERIALS", label: "Materiales" },
  { value: "SERVICES", label: "Servicios" },
  { value: "EVENTS", label: "Eventos" },
  { value: "REPAIRS", label: "Reparaciones" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "FOOD", label: "Alimentación" },
  { value: "DECORATION", label: "Decoración" },
  { value: "PRIZES", label: "Premios" },
  { value: "ADMINISTRATION", label: "Administración" },
  { value: "OTHER", label: "Otros" },
] as const;

export const EXPENSE_PAYMENT_METHODS:
ReadonlyArray<{ value: ExpensePaymentMethod; label: string }> = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CARD", label: "Tarjeta" },
  { value: "OTHER", label: "Otro" },
] as const;

export const expenseCategoryLabel = (value: ExpenseCategory) =>
  EXPENSE_CATEGORIES.find((item) => item.value === value)?.label ?? value;

export const expensePaymentLabel = (value?: ExpensePaymentMethod) =>
  EXPENSE_PAYMENT_METHODS.find((item) => item.value === value)?.label ?? "No informado";
