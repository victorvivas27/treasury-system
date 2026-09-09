import { apiClient } from "@/core/D-config/api";

const base = "/tesoreria/pagos/mercado-pago";
export const mercadoPagoRepository = {
  async available() {
    return (await apiClient.get<{ enabled: boolean }>(`${base}/disponibilidad`)).data.enabled;
  },
  async checkout(id: number) {
    return (await apiClient.post<{ preferenceId: string; checkoutUrl: string }>(`${base}/cuotas/${id}/checkout`)).data;
  },
  async reconcile(paymentId: string) {
    return (await apiClient.post<{ status: string; providerStatus: string | null }>(`${base}/retorno`, { paymentId })).data;
  },
};
