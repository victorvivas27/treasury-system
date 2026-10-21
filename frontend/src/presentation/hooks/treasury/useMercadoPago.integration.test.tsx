import { mercadoPagoAvailability } from "./mercadoPagoAvailability";
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/core/D-config/api';
import { clearAccessToken, clearCsrfToken } from '@/core/D-config/axiosInterceptor';
import { useMercadoPago } from './useMercadoPago';

// Only the HTTP transport is replaced. Router, hook, repository, Axios request/
// response transformations and application interceptors remain connected.
const originalAdapter = apiClient.defaults.adapter;
let requests: InternalAxiosRequestConfig[];
let respond: (request: InternalAxiosRequestConfig) => unknown;
const reload = vi.fn<() => Promise<void>>();

function PaymentPanel({ admin = false }: { admin?: boolean }) {
  const payment = useMercadoPago(reload, admin);
  return <div>
    <output aria-label="availability">{payment.checkingAvailability ? 'loading'
      : payment.availabilityError ? 'error' : payment.enabled ? 'enabled' : 'disabled'}</output>
    <p role="status" aria-label="payment status">{payment.message}</p>
    <button disabled={payment.busy} onClick={() => void payment.retry()}>Verify payment</button>
    <button disabled={payment.busy} onClick={() => void payment.checkout(7)}>Pay fee</button>
    <output aria-label="retry">{String(payment.canRetryReturn)}</output>
  </div>;
}

function openPanel(query = '', admin = false) {
  return render(<MemoryRouter initialEntries={[`/tesoreria/pagos${query}`]}>
    <PaymentPanel admin={admin} />
  </MemoryRouter>);
}

beforeEach(() => {
  mercadoPagoAvailability.clear();
  requests = [];
  reload.mockReset().mockResolvedValue(undefined);
  clearAccessToken();
  clearCsrfToken();
  respond = request => request.url?.endsWith('/disponibilidad')
    ? { enabled: true } : { status: 'PAID', providerStatus: 'approved' };
  const adapter: AxiosAdapter = async request => {
    requests.push(request);
    const data = await respond(request);
    return { data: JSON.stringify(data), status: 200, statusText: 'OK', headers: {}, config: request };
  };
  apiClient.defaults.adapter = adapter;
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.useRealTimers();
});

describe('Mercado Pago payment flow through the HTTP boundary', () => {
  it('confirms only the server result and sends the payment ID in the request body', async () => {
    openPanel('?mp_return=1&payment_id=42&status=rejected');
    await screen.findByText('Pago confirmado. Tu cuota está pagada.');
    expect(screen.getByLabelText('availability')).toHaveTextContent('enabled');
    const request = requests.find(item => item.url?.endsWith('/retorno'))!;
    expect(request.method).toBe('post');
    expect(JSON.parse(request.data)).toEqual({ paymentId: '42' });
    expect(request.withCredentials).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('retry')).toHaveTextContent('false');
  });

  it('does not trust an approved URL when the provider rejected the payment', async () => {
    respond = request => request.method === 'get' ? { enabled: true }
      : { status: 'PENDING', providerStatus: 'rejected' };
    openPanel('?mp_return=1&collection_id=43&status=approved');
    await screen.findByText(/El pago fue rechazado/);
    expect(screen.getByLabelText('retry')).toHaveTextContent('false');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('recovers from a verification failure through the user retry action', async () => {
    let attempts = 0;
    respond = request => {
      if (request.method === 'get') return { enabled: true };
      if (++attempts === 1) throw new AxiosError('Network unavailable', 'ERR_NETWORK', request);
      return { status: 'PAID', providerStatus: 'approved' };
    };
    openPanel('?mp_return=1&payment_id=44');
    await screen.findByText(/No pudimos verificar el pago/);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByLabelText('retry')).toHaveTextContent('true');
    fireEvent.click(screen.getByRole('button', { name: 'Verify payment' }));
    await screen.findByText(/Pago confirmado/);
    expect(attempts).toBe(2);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('polls a pending payment until the server confirms it', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    respond = request => request.method === 'get' ? { enabled: true }
      : ++attempts === 1 ? { status: 'PENDING', providerStatus: null }
        : { status: 'PAID', providerStatus: 'approved' };
    const panel = openPanel('?mp_return=1&payment_id=45');
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByRole('status', { name: 'payment status' })).toHaveTextContent('pendiente de confirmación');
    expect(screen.getByLabelText('retry')).toHaveTextContent('true');
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole('status', { name: 'payment status' })).toHaveTextContent('Pago confirmado');
    expect(attempts).toBe(2);
    panel.unmount();
    await vi.advanceTimersByTimeAsync(60000);
    expect(attempts).toBe(2);
  });

  it.each(['', '&payment_id=invalid', `&payment_id=${'1'.repeat(31)}`])(
    'does not send a verification request for an invalid or absent ID: %s', async id => {
      openPanel(`?mp_return=1${id}`);
      await screen.findByText(/Si no completaste el pago/);
      await waitFor(() => expect(screen.getByLabelText('availability')).toHaveTextContent('enabled'));
      expect(requests.every(request => request.method === 'get')).toBe(true);
      if (!id) {
        fireEvent.click(screen.getByRole('button', { name: 'Verify payment' }));
        expect(requests).toHaveLength(1);
      }
    },
  );

  it('does not reconcile a return in the administrator view', async () => {
    openPanel('?mp_return=1&payment_id=46', true);
    await waitFor(() => expect(screen.getByLabelText('availability')).toHaveTextContent('enabled'));
    expect(requests).toHaveLength(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('keeps payments disabled when the server disables the provider', async () => {
    respond = () => ({ enabled: false });
    openPanel();
    await waitFor(() => expect(screen.getByLabelText('availability')).toHaveTextContent('disabled'));
    expect(screen.getByLabelText('availability')).not.toHaveTextContent('error');
  });

  it('shows a retry failure without claiming that payment succeeded', async () => {
    respond = request => {
      if (request.method === 'get') return { enabled: true };
      throw new AxiosError('Offline', 'ERR_NETWORK', request);
    };
    openPanel('?mp_return=1&payment_id=47');
    await screen.findByText(/Actualiza su estado antes de volver a pagar/);
    fireEvent.click(screen.getByRole('button', { name: 'Verify payment' }));
    await screen.findByText(/Intenta actualizar su estado nuevamente/);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Verify payment' })).toBeEnabled();
  });

  it('stops automatic polling after twelve pending responses and allows a manual check', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    respond = request => {
      if (request.method === 'get') return { enabled: true };
      attempts += 1;
      return { status: 'PENDING', providerStatus: null };
    };
    openPanel('?mp_return=1&payment_id=48');
    await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
    expect(attempts).toBe(12);
    expect(screen.getByLabelText('retry')).toHaveTextContent('true');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verify payment' }));
    });
    expect(attempts).toBe(13);
    expect(screen.getByRole('status', { name: 'payment status' })).toHaveTextContent('pendiente de confirmación');
  });

  it('does not reload payment information after the panel unmounts during verification', async () => {
    let complete!: (value: unknown) => void;
    respond = request => request.method === 'get' ? { enabled: true }
      : new Promise(resolve => { complete = resolve; });
    const panel = openPanel('?mp_return=1&payment_id=49');
    await waitFor(() => expect(requests.some(request => request.url?.endsWith('/retorno'))).toBe(true));
    panel.unmount();
    await act(async () => { complete({ status: 'PAID', providerStatus: 'approved' }); });
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not schedule polling after the panel unmounts during a data reload', async () => {
    let finishReload!: () => void;
    reload.mockReturnValue(new Promise(resolve => { finishReload = resolve; }));
    respond = request => request.method === 'get' ? { enabled: true }
      : { status: 'PENDING', providerStatus: null };
    const panel = openPanel('?mp_return=1&payment_id=50');
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    panel.unmount();
    await act(async () => { finishReload(); });
    expect(requests.filter(request => request.method === 'post')).toHaveLength(1);
  });

  it('shows availability failure after the safe HTTP read retry is exhausted', async () => {
    respond = request => { throw new AxiosError('Offline', 'ERR_NETWORK', request); };
    openPanel();
    await waitFor(() => expect(screen.getByLabelText('availability')).toHaveTextContent('error'));
    expect(requests).toHaveLength(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it.each([
    'http://www.mercadopago.cl/pay',
    'https://www.mercadopago.cl.attacker.example/pay',
    'https://user:password@www.mercadopago.cl/pay',
    'https://:password@www.mercadopago.cl/pay',
    'https://www.mercadopago.cl:8443/pay',
    'invalid-url',
  ])('rejects unsafe checkout redirects: %s', async checkoutUrl => {
    respond = request => request.method === 'get' ? { enabled: true }
      : { preferenceId: 'pref-7', checkoutUrl };
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Pay fee' }));
    await screen.findByText(/No pudimos abrir Mercado Pago/);
    const writes = requests.filter(request => request.method === 'post');
    expect(writes).toHaveLength(1);
    expect(writes[0].url).toBe('/tesoreria/pagos/mercado-pago/cuotas/7/checkout');
    expect(screen.getByRole('button', { name: 'Pay fee' })).toBeEnabled();
  });
});
