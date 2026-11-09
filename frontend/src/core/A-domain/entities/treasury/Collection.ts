import type { ExpenseCategory } from './Treasury';
export interface CollectionFamily {
  familyId: number; familyCode: string; studentName: string; guardian: string | null; course: string;
  expected: number; paid: number; remaining: number; status: 'PENDING' | 'PARTIAL' | 'PAID' | 'EXEMPT';
}
export interface CollectionMovement {
  requestId: string; familyId: number | null; incomeId: number | null; expenseId: number | null;
  amount: number; date: string; reference: string | null; recipient: string | null; active: boolean; recordedAt?: string | null;
}
export interface CollectionCampaign {
  id: number; schoolYear: number; title: string; defaultAmount: number; dueDate: string | null; incomeId: number | null;
  expected: number; collected: number; remaining: number; spent: number; available: number;
  families: CollectionFamily[]; movements: CollectionMovement[];
}
export interface CollectionFamilyOption { familyId: number; familyCode: string; studentName: string; primaryGuardian: string | null; course: string }
export interface CreateCollection { year: number; title: string; defaultAmount: number; dueDate: string | null; familyIds: number[] }
export interface CollectionPayment { amount: number; date: string; reference: string; requestId: string }
export interface CollectionProviderPayment extends CollectionPayment { recipient: string; category: ExpenseCategory }

export interface CollectionReceipt { requestId: string; originalName: string }
