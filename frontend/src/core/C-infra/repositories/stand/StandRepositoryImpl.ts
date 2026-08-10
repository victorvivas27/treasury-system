import type { IStandRepository } from "@/core/A-domain/repository/stand/IStandRepository";
import type {
  StandPayload, StandProductPayload, StandSalePayload, StandSaleUpdatePayload,
} from "@/core/A-domain/entities/stand/Stand";
import { apiClient } from "@/core/D-config/api";

export class StandRepositoryImpl implements IStandRepository {
  private readonly baseUrl = "/tesoreria/stands";

  async list(eventId: number) {
    return (await apiClient.get(this.baseUrl, { params: { eventId } })).data;
  }
  async create(payload: StandPayload) {
    return (await apiClient.post(this.baseUrl, payload)).data;
  }
  async update(id: number, payload: StandPayload) {
    return (await apiClient.put(`${this.baseUrl}/${id}`, payload)).data;
  }
  async delete(id: number) {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }
  async listProducts(standId: number) {
    return (await apiClient.get(`${this.baseUrl}/${standId}/productos`)).data;
  }
  async addProduct(standId: number, payload: StandProductPayload) {
    return (await apiClient.post(`${this.baseUrl}/${standId}/productos`, payload)).data;
  }
  async updateProduct(standId: number, productId: number, payload: StandProductPayload) {
    return (await apiClient.put(
      `${this.baseUrl}/${standId}/productos/${productId}`, payload)).data;
  }
  async deleteProduct(standId: number, productId: number) {
    await apiClient.delete(`${this.baseUrl}/${standId}/productos/${productId}`);
  }
  async open(standId: number) {
    return (await apiClient.post(`${this.baseUrl}/${standId}/abrir`)).data;
  }
  async close(standId: number) {
    return (await apiClient.post(`${this.baseUrl}/${standId}/cerrar`)).data;
  }
  async reopen(standId: number) {
    return (await apiClient.post(`${this.baseUrl}/${standId}/reabrir`)).data;
  }
  async listSales(standId: number) {
    return (await apiClient.get(`${this.baseUrl}/${standId}/ventas`)).data;
  }
  async registerSale(standId: number, payload: StandSalePayload) {
    return (await apiClient.post(`${this.baseUrl}/${standId}/ventas`, payload)).data;
  }
  async cancelSale(standId: number, saleId: number, reason: string) {
    return (await apiClient.patch(
      `${this.baseUrl}/${standId}/ventas/${saleId}/anulacion`, { reason })).data;
  }
  async updateSale(standId: number, saleId: number, payload: StandSaleUpdatePayload) {
    return (await apiClient.put(
      `${this.baseUrl}/${standId}/ventas/${saleId}`, payload)).data;
  }
  async summary(standId: number) {
    return (await apiClient.get(`${this.baseUrl}/${standId}/resumen`)).data;
  }
}
