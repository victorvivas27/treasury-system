import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { mercadoPagoRepository } from "@/core/C-infra/repositories/treasury/MercadoPagoRepository";
import { useMercadoPago } from "./useMercadoPago";

vi.mock("@/core/C-infra/repositories/treasury/MercadoPagoRepository", () => ({
  mercadoPagoRepository: { available: vi.fn(), checkout: vi.fn(), reconcile: vi.fn() },
}));
const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter
  initialEntries={["/tesoreria/pagos?mp_return=1&payment_id=42&status=approved"]}>{children}</MemoryRouter>;

describe("retorno de Mercado Pago", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(mercadoPagoRepository.available).mockResolvedValue(true); });

  it("consulta al backend y no confía en status=approved de la URL", async () => {
    vi.mocked(mercadoPagoRepository.reconcile).mockResolvedValue({ status: "PENDING", providerStatus: "rejected" });
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useMercadoPago(reload, false), { wrapper });
    await waitFor(() => expect(result.current.message).toContain("rechazado"));
    expect(mercadoPagoRepository.reconcile).toHaveBeenCalledWith("42");
    expect(reload).toHaveBeenCalledOnce();
    expect(result.current.message).not.toContain("Pago confirmado");
  });

  it("recarga cuotas e historial tras la confirmación y cierra la reconsulta", async () => {
    vi.mocked(mercadoPagoRepository.reconcile).mockResolvedValue({ status: "PAID", providerStatus: "approved" });
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useMercadoPago(reload, false), { wrapper });
    await waitFor(() => expect(result.current.message).toContain("Tu cuota está pagada"));
    expect(result.current.canRetryReturn).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("mantiene el pago sin confirmar si falla la verificación", async () => {
    vi.mocked(mercadoPagoRepository.reconcile).mockRejectedValue(new Error("network"));
    const reload = vi.fn();
    const { result } = renderHook(() => useMercadoPago(reload, false), { wrapper });
    await waitFor(() => expect(result.current.message).toContain("No pudimos verificar"));
    expect(reload).not.toHaveBeenCalled();
  });
});
