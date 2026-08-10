export type StandStatus = "PREPARATION" | "OPEN" | "CLOSED";
export type StandPaymentMethod = "CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "OTHER";

export interface Stand {
  id: number;
  eventId: number;
  eventName: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  responsible: string;
  initialFund: number;
  status: StandStatus;
  paymentMethods: StandPaymentMethod[];
  debitCommission: number;
  creditCommission: number;
  transferCommission: number;
}

export type StandPayload = Omit<Stand, "id" | "eventName" | "status">;

export interface StandProduct {
  id: number;
  standId: number;
  name: string;
  category?: string;
  variant?: string;
  presentation?: string;
  unitEquivalence?: number;
  price: number;
  unitCost: number;
  initialStock?: number;
  currentStock?: number;
  available: boolean;
}

export interface StandProductPayload {
  name: string;
  category?: string;
  variant?: string;
  presentation?: string;
  unitEquivalence?: number;
  price: number;
  unitCost: number;
  stock?: number;
  available: boolean;
}

export interface StandSaleItem {
  productId: number;
  productName: string;
  category?: string;
  variant?: string;
  presentation?: string;
  unitEquivalence?: number;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  costSubtotal: number;
}

export interface StandSale {
  id: number;
  standId: number;
  items: StandSaleItem[];
  paymentMethod: StandPaymentMethod;
  total: number;
  amountReceived?: number;
  changeAmount?: number;
  observation?: string;
  registeredBy: string;
  soldAt: string;
  status: "ACTIVE" | "CANCELLED";
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  modifiedAt?: string;
  modifiedBy?: string;
  modificationReason?: string;
}

export interface StandSalePayload {
  items: Array<{ productId: number; quantity: number }>;
  paymentMethod: StandPaymentMethod;
  amountReceived?: number;
  observation?: string;
}

export interface StandSaleUpdatePayload extends StandSalePayload {
  reason: string;
}

export interface StandSummary {
  totalSold: number;
  salesByPaymentMethod: Record<StandPaymentMethod, number>;
  expectedCash: number;
  initialFund: number;
  totalCost: number;
  commissions: number;
  debitCommission: number;
  creditCommission: number;
  transferCommission: number;
  netProfit: number;
  saleCount: number;
  unitsSold: number;
  salesByProduct: Array<{
    product: string; category?: string; variant?: string; units: number; total: number;
    cost: number; profit: number;
  }>;
  salesByCategory: Record<string, number>;
  salesByVariant: Record<string, number>;
  stockAlerts: Array<{
    productId: number; product: string; variant?: string; stock: number; soldOut: boolean;
  }>;
  unitsByPresentation: Record<string, number>;
  equivalentUnits: number;
}
