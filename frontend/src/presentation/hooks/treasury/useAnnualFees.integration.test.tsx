import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../../../core/D-config/api';
import { clearAccessToken, clearCsrfToken } from '../../../core/D-config/axiosInterceptor';
import { useAnnualFees } from './useAnnualFees';

// Keep hook, use cases, repository and Axios interceptors connected.
const originalAdapter = apiClient.defaults.adapter;
let requests: InternalAxiosRequestConfig[];
let respond: (request: InternalAxiosRequestConfig) => unknown;
const dashboard = { totalFamilies: 1, annualFamilies: 1, twoInstallmentFamilies: 0,
  pendingObligations: 1, paidObligations: 0, collectedAmount: 0, pendingAmount: 50000 };
const page = { families: [{ familyId: 7, familyCode: 'FA-7' }],
  plans: [{ familyId: 7, mode: 'ANUAL' }],
  obligations: [{ id: 12, amount: 50000, status: 'PENDIENTE' }], dashboard };
const config = { annualAmount: 50000, allowedMode: 'AMBAS' as const,
  annualDueDate: '2026-12-01', firstDueDate: '2026-06-01', secondDueDate: '2026-12-01' };
const reads = () => requests.filter(request => request.url === '/tesoreria/cuotas/page');
const writes = () => requests.filter(request => request.method !== 'get');

function reject(request: InternalAxiosRequestConfig, data: unknown) {
  throw new AxiosError('Rejected', 'ERR_BAD_REQUEST', request, undefined,
    { data, status: 422, statusText: 'Unprocessable Entity', headers: {}, config: request });
}

beforeEach(() => {
  requests = [];
  clearAccessToken();
  clearCsrfToken();
  respond = request => request.url === '/tesoreria/cuotas/page' ? page
    : request.url === '/tesoreria/configuraciones' ? [{ id: 1, year: 2026, ...config }]
      : { generated: 1 };
  apiClient.defaults.adapter = async request => {
    requests.push(request);
    const data = await respond(request);
    return { data: JSON.stringify(data), status: 200, statusText: 'OK', headers: {}, config: request };
  };
});
afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

async function openFees() {
  const hook = renderHook(() => useAnnualFees());
  await waitFor(() => expect(hook.result.current.configs).toHaveLength(1));
  expect(hook.result.current.dataLoading).toBe(false);
  return hook;
}

describe('annual fees through the HTTP boundary', () => {
  it('loads families, obligations, plans and totals, then applies year and filters', async () => {
    const { result } = await openFees();
    expect(result.current).toMatchObject(page);
    await act(async () => { result.current.setYear(2027); });
    await waitFor(() => expect(reads().at(-1)?.params.year).toBe(2027));
    await act(async () => { await result.current.refresh({ familyId: 7, status: 'PENDIENTE' }); });
    expect(reads().at(-1)?.params).toEqual({ year: 2027, familyId: 7, status: 'PENDIENTE' });
    expect(reads().at(-1)?.withCredentials).toBe(true);
  });

  it('reflects a recorded payment only after refreshing server data', async () => {
    const { result } = await openFees();
    let finish!: (value: unknown) => void;
    respond = request => request.method === 'post' ? new Promise(resolve => { finish = resolve; })
      : { ...page, obligations: [{ ...page.obligations[0], status: 'PAGADA' }],
        dashboard: { ...dashboard, collectedAmount: 50000, pendingAmount: 0 } };
    let payment!: Promise<boolean>;
    act(() => { payment = result.current.pay(12, '2026-10-21', 50000, 'Transferencia'); });
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(result.current.loading).toBe(true);
    expect(result.current.obligations[0].status).toBe('PENDIENTE');
    expect(reads()).toHaveLength(1);
    expect(JSON.parse(writes()[0].data)).toEqual({ paymentDate: '2026-10-21', amount: 50000, observations: 'Transferencia' });
    expect(writes()[0].url).toBe('/tesoreria/obligaciones/12/pagos');
    await act(async () => { finish({}); expect(await payment).toBe(true); });
    expect(result.current.obligations[0].status).toBe('PAGADA');
    expect(result.current.dashboard?.collectedAmount).toBe(50000);
    expect(result.current.message).toBe('Pago registrado correctamente.');
    expect(result.current.loading).toBe(false);
    act(() => result.current.clearMessage());
    expect(result.current.message).toBe('');
  });

  it.each([
    [{ errors: { amount: 'Monto inválido.', date: 'Fecha requerida.', ignored: '' } }, 'Monto inválido. Fecha requerida.'],
    [{ message: 'Pago duplicado.' }, 'Pago duplicado.'],
    [{ errors: {}, message: 'Cuota anulada.' }, 'Cuota anulada.'],
    [{}, 'No fue posible completar la operación.'],
  ])('preserves obligations and does not refresh or retry a rejected payment: %j', async (data, message) => {
    const { result } = await openFees();
    respond = request => reject(request, data);
    await act(async () => { expect(await result.current.pay(12, '2026-10-21', 50000)).toBe(false); });
    expect(result.current.actionError).toBe(message);
    expect(result.current.obligations).toEqual(page.obligations);
    expect(result.current.message).toBe('');
    expect(result.current.loading).toBe(false);
    expect(writes()).toHaveLength(1);
    expect(reads()).toHaveLength(1);
    act(() => result.current.clearActionError());
    expect(result.current.actionError).toBe('');
  });

  it('recovers from a network failure with an explicit payment retry', async () => {
    const { result } = await openFees();
    respond = () => { throw new Error('Offline'); };
    await act(async () => { expect(await result.current.pay(12, '2026-10-21', 50000)).toBe(false); });
    expect(result.current.actionError).toBe('No fue posible completar la operación.');
    respond = request => request.method === 'get' ? page : {};
    await act(async () => { expect(await result.current.pay(12, '2026-10-21', 50000)).toBe(true); });
    expect(result.current.actionError).toBe('');
    expect(writes()).toHaveLength(2);
  });

  it.each(['ANUAL', 'DOS_CUOTAS', 'PERSONALIZADA'] as const)(
    'assigns %s and regenerates only standard obligations', async mode => {
      const { result } = await openFees();
      const payload = mode === 'PERSONALIZADA'
        ? { mode, customAmount: 10000, customDueDate: '2026-12-01', customConcept: 'Acuerdo' } : { mode };
      await act(async () => { expect(await result.current.assignMode(7, payload)).toBe(true); });
      expect(writes()[0].url).toBe('/tesoreria/modalidades/7');
      expect(JSON.parse(writes()[0].data)).toEqual({ year: result.current.year, ...payload });
      expect(writes()).toHaveLength(mode === 'PERSONALIZADA' ? 1 : 2);
      if (mode !== 'PERSONALIZADA') expect(writes()[1].url).toBe(`/tesoreria/obligaciones/generar/${result.current.year}`);
      expect(reads()).toHaveLength(2);
      expect(result.current.message).toBe(mode === 'PERSONALIZADA' ? 'Cuota personalizada creada.'
        : 'Modalidad actualizada y obligaciones regeneradas.');
    });

  it('does not regenerate obligations when mode assignment fails', async () => {
    const { result } = await openFees();
    respond = request => reject(request, { message: 'Familia no disponible.' });
    await act(async () => { expect(await result.current.assignMode(7, { mode: 'ANUAL' })).toBe(false); });
    expect(writes()).toHaveLength(1);
    expect(reads()).toHaveLength(1);
    expect(result.current.actionError).toBe('Familia no disponible.');
  });

  it('saves configuration and reloads both fees and configuration history', async () => {
    const { result } = await openFees();
    await act(async () => { expect(await result.current.saveConfig(config)).toBe(true); });
    expect(writes()[0].method).toBe('put');
    expect(writes()[0].url).toBe(`/tesoreria/configuraciones/${result.current.year}`);
    expect(JSON.parse(writes()[0].data)).toEqual(config);
    expect(reads()).toHaveLength(2);
    expect(requests.filter(request => request.url === '/tesoreria/configuraciones')).toHaveLength(2);
    expect(result.current.message).toBe('Configuración anual guardada.');
  });

  it.each(['annul', 'removeFamilyPlan', 'generate'] as const)('executes %s and refreshes fees', async operation => {
    const { result } = await openFees();
    await act(async () => {
      const success = operation === 'annul' ? await result.current.annul(12, 'Error de registro')
        : operation === 'removeFamilyPlan' ? await result.current.removeFamilyPlan(7, 'Retiro')
          : await result.current.generate();
      expect(success).toBe(true);
    });
    const request = writes()[0];
    expect(request.method).toBe('post');
    expect(request.url).toBe(operation === 'annul' ? '/tesoreria/obligaciones/12/anulacion'
      : operation === 'removeFamilyPlan' ? '/tesoreria/modalidades/7/anulacion'
        : `/tesoreria/obligaciones/generar/${result.current.year}`);
    if (operation !== 'generate') expect(JSON.parse(request.data)).toEqual({ reason: operation === 'annul' ? 'Error de registro' : 'Retiro' });
    if (operation === 'removeFamilyPlan') expect(request.params).toEqual({ year: result.current.year });
    expect(reads()).toHaveLength(2);
    expect(result.current.actionError).toBe('');
  });

  it('clears stale fee data on a read failure and recovers on refresh', async () => {
    const { result } = await openFees();
    respond = request => reject(request, {});
    await act(async () => { await result.current.refresh({}, true); });
    expect(result.current).toMatchObject({ families: [], plans: [], obligations: [], dashboard: null,
      loading: false, dataLoading: false, error: 'Configura la cuota anual para comenzar.' });
    respond = request => request.url === '/tesoreria/cuotas/page' ? page : [];
    await act(async () => { await result.current.refresh(); });
    expect(result.current).toMatchObject({ ...page, error: '' });
  });

  it('keeps fee data available when configuration history fails', async () => {
    respond = request => request.url === '/tesoreria/cuotas/page' ? page : reject(request, {});
    const { result } = renderHook(() => useAnnualFees());
    await waitFor(() => expect(requests.some(request => request.url === '/tesoreria/configuraciones')).toBe(true));
    await act(async () => {});
    expect(result.current).toMatchObject({ ...page, configs: [], loading: false, error: '' });
  });
});
