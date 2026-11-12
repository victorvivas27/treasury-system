import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/core/D-config/api';
import { CollectionUseCases } from '@/core/B-application/use-cases/treasury/CollectionUseCases';
import { CollectionRepositoryImpl } from './CollectionRepositoryImpl';

vi.mock('@/core/D-config/api', () => ({ apiClient: { post: vi.fn() } }));
const payment = { amount: 3000, date: '2026-01-01', reference: 'REF', recipient: 'Bus', category: 'TRANSPORT' as const, requestId: 'payment-1' };

describe('Provider payment transport', () => {
  beforeEach(() => vi.clearAllMocks());
  it('preserves JSON for payments without a receipt', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 1 } });
    const useCases = new CollectionUseCases(new CollectionRepositoryImpl());
    await expect(useCases.disburse(1, payment)).resolves.toEqual({ id: 1 });
    expect(apiClient.post).toHaveBeenCalledWith('/tesoreria/recaudaciones/1/proveedor', payment);
  });
  it('sends provider details and receipt together and propagates upload failures', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('upload failed'));
    const useCases = new CollectionUseCases(new CollectionRepositoryImpl());
    const file = new File(['%PDF-1.7 prueba'], 'bus.pdf', { type: 'application/pdf' });
    await expect(useCases.disburse(1, payment, file)).rejects.toThrow('upload failed');
    const [url, body, config] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe('/tesoreria/recaudaciones/1/proveedor');
    expect(config?.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    expect((form.get('file') as File).name).toBe('bus.pdf');
    expect((form.get('payment') as Blob).type).toBe('application/json');
    const serialized = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(form.get('payment') as Blob);
    });
    expect(JSON.parse(serialized)).toEqual(payment);
  });
});
