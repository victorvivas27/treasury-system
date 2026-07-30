import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/D-config/api";
import { StandRepositoryImpl } from "./StandRepositoryImpl";

vi.mock("@/core/D-config/api", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

describe("StandRepositoryImpl", () => {
  const repository = new StandRepositoryImpl();
  beforeEach(() => vi.clearAllMocks());

  it("[Stand repository #01] usa el evento real al listar", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    await repository.list(7);
    expect(apiClient.get).toHaveBeenCalledWith("/tesoreria/stands", {
      params: { eventId: 7 },
    });
  });

  it("[Stand repository #02] registra una compra con varios productos", async () => {
    const payload = {
      items: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }],
      paymentMethod: "CASH" as const, amountReceived: 10000,
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 5 } });
    await repository.registerSale(3, payload);
    expect(apiClient.post).toHaveBeenCalledWith("/tesoreria/stands/3/ventas", payload);
  });

  it("[Stand repository #03] expone las transiciones de jornada", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    await repository.open(3);
    await repository.close(3);
    await repository.reopen(3);
    expect(apiClient.post).toHaveBeenNthCalledWith(1, "/tesoreria/stands/3/abrir");
    expect(apiClient.post).toHaveBeenNthCalledWith(2, "/tesoreria/stands/3/cerrar");
    expect(apiClient.post).toHaveBeenNthCalledWith(3, "/tesoreria/stands/3/reabrir");
  });

  it("[Stand repository #04] anula una venta conservando el motivo", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 9, status: "CANCELLED" } });
    await repository.cancelSale(3, 9, "Cantidad incorrecta");
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/tesoreria/stands/3/ventas/9/anulacion",
      { reason: "Cantidad incorrecta" },
    );
  });

  it("[Stand repository #05] modifica una venta y envía el motivo de corrección", async () => {
    const payload = {
      items: [{ productId: 4, quantity: 2 }],
      paymentMethod: "DEBIT" as const,
      reason: "Cantidad incorrecta",
    };
    vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 9 } });
    await repository.updateSale(3, 9, payload);
    expect(apiClient.put).toHaveBeenCalledWith(
      "/tesoreria/stands/3/ventas/9", payload);
  });
});
