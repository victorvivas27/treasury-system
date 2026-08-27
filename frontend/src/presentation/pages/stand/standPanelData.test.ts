import { describe, expect, it, vi } from "vitest";
import { loadStandPanelData } from "./standPanelData";

const client = () => ({
  listProducts: vi.fn().mockResolvedValue([{ id: 1 }]),
  listSales: vi.fn().mockResolvedValue([{ id: 2 }]),
  summary: vi.fn().mockResolvedValue({ totalSold: 3000 }),
});

describe("loadStandPanelData", () => {
  it("carga solo productos al entrar a la vista administrativa", async () => {
    const api = client();

    const result = await loadStandPanelData(api, 7, "products", false);

    expect(result).toEqual({ products: [{ id: 1 }] });
    expect(api.listProducts).toHaveBeenCalledWith(7);
    expect(api.listSales).not.toHaveBeenCalled();
    expect(api.summary).not.toHaveBeenCalled();
  });

  it("carga productos y ventas solamente al abrir venta rapida", async () => {
    const api = client();

    const result = await loadStandPanelData(api, 7, "sales", false);

    expect(result).toEqual({ products: [{ id: 1 }], sales: [{ id: 2 }] });
    expect(api.listProducts).toHaveBeenCalledWith(7);
    expect(api.listSales).toHaveBeenCalledWith(7);
    expect(api.summary).not.toHaveBeenCalled();
  });

  it("carga solo el resumen agregado al abrir resumen", async () => {
    const api = client();

    const result = await loadStandPanelData(api, 7, "summary", false);

    expect(result).toEqual({ summary: { totalSold: 3000 } });
    expect(api.listProducts).not.toHaveBeenCalled();
    expect(api.listSales).not.toHaveBeenCalled();
    expect(api.summary).toHaveBeenCalledWith(7);
  });

  it("mantiene al usuario de consulta en el resumen agregado", async () => {
    const api = client();

    await loadStandPanelData(api, 7, "products", true);

    expect(api.listProducts).not.toHaveBeenCalled();
    expect(api.listSales).not.toHaveBeenCalled();
    expect(api.summary).toHaveBeenCalledWith(7);
  });
});
