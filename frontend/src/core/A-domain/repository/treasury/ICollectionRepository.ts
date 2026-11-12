import type { CollectionReceipt, CollectionCampaign, CollectionFamilyOption, CollectionPayment, CollectionProviderPayment, CreateCollection } from '../../entities/treasury/Collection';
export interface ICollectionRepository {
  list(year: number): Promise<CollectionCampaign[]>;
  families(): Promise<CollectionFamilyOption[]>;
  create(payload: CreateCollection): Promise<CollectionCampaign>;
  update(id: number, title: string, dueDate: string | null): Promise<CollectionCampaign>;
  archive(id: number, reason: string): Promise<void>;
  expected(id: number, familyId: number, amount: number): Promise<CollectionCampaign>;
  collect(id: number, familyId: number, payload: CollectionPayment, file?: File): Promise<CollectionCampaign>;
  receipts(id: number): Promise<CollectionReceipt[]>;
  downloadReceipt(id: number, requestId: string): Promise<Blob>;
  disburse(id: number, payload: CollectionProviderPayment, file?: File): Promise<CollectionCampaign>;
  postIncome(id: number, date: string, reference: string): Promise<CollectionCampaign>;
  cancelPayments(id: number, familyId: number, reason: string): Promise<CollectionCampaign>;
}
