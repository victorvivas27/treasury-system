import type {
  Stand, StandPayload, StandProduct, StandProductPayload, StandSale,
  StandSalePayload, StandSaleUpdatePayload, StandSummary,
} from "@/core/A-domain/entities/stand/Stand";

export interface IStandRepository {
  list(eventId: number): Promise<Stand[]>;
  create(payload: StandPayload): Promise<Stand>;
  update(id: number, payload: StandPayload): Promise<Stand>;
  delete(id: number): Promise<void>;
  listProducts(standId: number): Promise<StandProduct[]>;
  addProduct(standId: number, payload: StandProductPayload): Promise<StandProduct>;
  updateProduct(standId: number, productId: number,
    payload: StandProductPayload): Promise<StandProduct>;
  deleteProduct(standId: number, productId: number): Promise<void>;
  open(standId: number): Promise<Stand>;
  close(standId: number): Promise<Stand>;
  reopen(standId: number): Promise<Stand>;
  listSales(standId: number): Promise<StandSale[]>;
  registerSale(standId: number, payload: StandSalePayload): Promise<StandSale>;
  cancelSale(standId: number, saleId: number, reason: string): Promise<StandSale>;
  deleteCancelledSale(standId: number, saleId: number): Promise<void>;
  updateSale(standId: number, saleId: number,
    payload: StandSaleUpdatePayload): Promise<StandSale>;
  summary(standId: number): Promise<StandSummary>;
}
