import type { IStandRepository } from "@/core/A-domain/repository/stand/IStandRepository";
import type {
  StandPayload, StandProductPayload, StandSalePayload, StandSaleUpdatePayload,
} from "@/core/A-domain/entities/stand/Stand";

export class StandUseCases {
  private readonly repository: IStandRepository;

  constructor(repository: IStandRepository) {
    this.repository = repository;
  }
  list(eventId: number) { return this.repository.list(eventId); }
  create(payload: StandPayload) { return this.repository.create(payload); }
  update(id: number, payload: StandPayload) { return this.repository.update(id, payload); }
  delete(id: number) { return this.repository.delete(id); }
  listProducts(standId: number) { return this.repository.listProducts(standId); }
  addProduct(standId: number, payload: StandProductPayload) {
    return this.repository.addProduct(standId, payload);
  }
  updateProduct(standId: number, productId: number, payload: StandProductPayload) {
    return this.repository.updateProduct(standId, productId, payload);
  }
  deleteProduct(standId: number, productId: number) {
    return this.repository.deleteProduct(standId, productId);
  }
  open(standId: number) { return this.repository.open(standId); }
  close(standId: number) { return this.repository.close(standId); }
  reopen(standId: number) { return this.repository.reopen(standId); }
  listSales(standId: number) { return this.repository.listSales(standId); }
  registerSale(standId: number, payload: StandSalePayload) {
    return this.repository.registerSale(standId, payload);
  }
  cancelSale(standId: number, saleId: number, reason: string) {
    return this.repository.cancelSale(standId, saleId, reason);
  }
  updateSale(standId: number, saleId: number, payload: StandSaleUpdatePayload) {
    return this.repository.updateSale(standId, saleId, payload);
  }
  summary(standId: number) { return this.repository.summary(standId); }
}
