import { apiClient } from '@/core/D-config/api';
import type { ICollectionRepository } from '@/core/A-domain/repository/treasury/ICollectionRepository';
import type { CollectionReceipt, CollectionCampaign, CollectionFamilyOption, CollectionPayment, CollectionProviderPayment, CreateCollection } from '@/core/A-domain/entities/treasury/Collection';
const base = '/tesoreria/recaudaciones';
export class CollectionRepositoryImpl implements ICollectionRepository {
  async list(year: number) { return (await apiClient.get<CollectionCampaign[]>(base, { params: { year } })).data; }
  async families() { return (await apiClient.get<CollectionFamilyOption[]>(`${base}/familias`)).data; }
  async create(payload: CreateCollection) { return (await apiClient.post<CollectionCampaign>(base, payload)).data; }
  async update(id: number, title: string, dueDate: string | null) { return (await apiClient.put<CollectionCampaign>(`${base}/${id}`, { title, dueDate })).data; }
  async archive(id: number, reason: string) { await apiClient.post(`${base}/${id}/eliminacion`, { reason }); }
  async expected(id: number, familyId: number, amount: number) { return (await apiClient.put<CollectionCampaign>(`${base}/${id}/familias/${familyId}`, { amount })).data; }
  async collect(id: number, familyId: number, payload: CollectionPayment, file?: File) {
    if (!file) return (await apiClient.post<CollectionCampaign>(`${base}/${id}/familias/${familyId}/pagos`, payload)).data;
    const form = new FormData();
    form.append('payment', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    form.append('file', file);
    return (await apiClient.post<CollectionCampaign>(`${base}/${id}/familias/${familyId}/pagos`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  }
  async receipts(id: number) { return (await apiClient.get<CollectionReceipt[]>(`${base}/${id}/comprobantes`)).data; }
  async downloadReceipt(id: number, requestId: string) { return (await apiClient.get<Blob>(`${base}/${id}/comprobantes/${requestId}`, { responseType: 'blob' })).data; }
  async disburse(id: number, payload: CollectionProviderPayment) { return (await apiClient.post<CollectionCampaign>(`${base}/${id}/proveedor`, payload)).data; }
  async postIncome(id: number, date: string, reference: string) { return (await apiClient.post<CollectionCampaign>(`${base}/${id}/ingreso`, { date, reference })).data; }
  async cancelPayments(id: number, familyId: number, reason: string) { return (await apiClient.post<CollectionCampaign>(`${base}/${id}/familias/${familyId}/anulacion`, { reason })).data; }
}
