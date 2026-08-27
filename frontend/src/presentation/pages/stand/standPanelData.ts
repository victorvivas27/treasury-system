import type {
  StandProduct, StandSale, StandSummary,
} from "@/core/A-domain/entities/stand/Stand";

export type StandPanelTab = "products" | "sales" | "summary";

type StandPanelClient = {
  listProducts(standId: number): Promise<StandProduct[]>;
  listSales(standId: number): Promise<StandSale[]>;
  summary(standId: number): Promise<StandSummary>;
};

export type StandPanelData = {
  products?: StandProduct[];
  sales?: StandSale[];
  summary?: StandSummary;
};

export const loadStandPanelData = async (
  client: StandPanelClient,
  standId: number,
  tab: StandPanelTab,
  readOnly: boolean,
): Promise<StandPanelData> => {
  if (readOnly || tab === "summary") {
    return { summary: await client.summary(standId) };
  }
  if (tab === "products") {
    return { products: await client.listProducts(standId) };
  }
  const [products, sales] = await Promise.all([
    client.listProducts(standId),
    client.listSales(standId),
  ]);
  return { products, sales };
};
