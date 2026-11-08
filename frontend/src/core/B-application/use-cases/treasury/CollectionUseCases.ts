import type { ICollectionRepository } from '@/core/A-domain/repository/treasury/ICollectionRepository';
import type { CollectionPayment, CollectionProviderPayment, CreateCollection } from '@/core/A-domain/entities/treasury/Collection';
export class CollectionUseCases {
  private readonly repository: ICollectionRepository;
  constructor(repository: ICollectionRepository) { this.repository = repository; }
  list(year: number) { return this.repository.list(year); }
  families() { return this.repository.families(); }
  create(payload: CreateCollection) { return this.repository.create(payload); }
  update(id: number, title: string, dueDate: string | null) { return this.repository.update(id, title, dueDate); }
  archive(id: number, reason: string) { return this.repository.archive(id, reason); }
  expected(id: number, familyId: number, amount: number) { return this.repository.expected(id, familyId, amount); }
  collect(id: number, familyId: number, payload: CollectionPayment, file?: File) { return this.repository.collect(id, familyId, payload, file); }
  receipts(id: number) { return this.repository.receipts(id); }
  downloadReceipt(id: number, requestId: string) { return this.repository.downloadReceipt(id, requestId); }
  disburse(id: number, payload: CollectionProviderPayment) { return this.repository.disburse(id, payload); }
  postIncome(id: number, date: string, reference: string) { return this.repository.postIncome(id, date, reference); }
  cancelPayments(id: number, familyId: number, reason: string) { return this.repository.cancelPayments(id, familyId, reason); }
}
