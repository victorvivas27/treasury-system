import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../../../core/D-config/api';
import { clearAccessToken, clearCsrfToken } from '../../../core/D-config/axiosInterceptor';
import { AnnualFeesPage } from './AnnualFeesPage';

// UI, hook, use cases, repository and interceptors remain real; replace transport only.
const originalAdapter = apiClient.defaults.adapter;
const year = new Date().getFullYear();
const family = { familyId: 7, familyCode: 'FA-7', primaryGuardian: 'Ana Pérez',
  studentName: 'Sofía Pérez', course: '4A' };
const plan = { id: 2, ...family, mode: 'ANUAL' };
const obligation = { id: 12, ...family, mode: 'ANUAL', installment: 'ANUAL',
  concept: 'Cuota del curso', amount: 50000, dueDate: `${year}-01-01`, status: 'PENDIENTE' };
const config = { id: 1, year, annualAmount: 50000, allowedMode: 'AMBAS',
  annualDueDate: `${year}-04-15`, firstDueDate: `${year}-04-15`, secondDueDate: `${year}-07-15` };
let requests: InternalAxiosRequestConfig[];
let page: Record<string, unknown>;
let proofs: unknown[];
let respond: (request: InternalAxiosRequestConfig) => unknown;
const writes = () => requests.filter(request => request.method !== 'get');
function failure(request: InternalAxiosRequestConfig, message = 'Operación rechazada') {
  throw new AxiosError(message, 'ERR_BAD_REQUEST', request, undefined,
    { data: { message }, status: 422, statusText: 'Unprocessable Entity', headers: {}, config: request });
}

beforeEach(() => {
  requests = [];
  proofs = [];
  clearAccessToken();
  clearCsrfToken();
  page = { families: [family], plans: [plan], obligations: [obligation],
    dashboard: { totalFamilies: 1, annualFamilies: 1, twoInstallmentFamilies: 0,
      pendingObligations: 1, paidObligations: 0, collectedAmount: 0, pendingAmount: 50000 } };
  respond = request => {
    if (request.url === '/tesoreria/cuotas/page') return page;
    if (request.url === '/tesoreria/configuraciones') return [config];
    if (request.url?.endsWith('/revision')) return proofs;
    return { generated: 1, id: 81 };
  };
  apiClient.defaults.adapter = async request => {
    requests.push(request);
    const data = await respond(request);
    return { data: JSON.stringify(data), status: 200, statusText: 'OK', headers: {}, config: request };
  };
});
afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

async function openPage() {
  render(<AnnualFeesPage />);
  await screen.findByText(`${year} configurado`);
  await waitFor(() => expect(requests.some(request => request.url?.endsWith('/revision'))).toBe(true));
}
async function openPayment() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Registrar pago' })[0]);
  return within(screen.getByRole('dialog'));
}

describe('annual fee administration from screen to HTTP', () => {
  it('loads server configuration and renders families and overdue obligations', async () => {
    await openPage();
    expect(screen.getAllByText('Ana Pérez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('VENCIDA')).toHaveLength(2);
    expect(screen.getByText(`1 familias configuradas para ${year}.`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar y generar cuotas' })).toBeDisabled();
  });

  it('sends edited annual configuration and closes the form after success', async () => {
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: /Configuración anual/ }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Monto anual'), { target: { value: '65000' } });
    fireEvent.change(dialog.getByLabelText('Modalidades permitidas'), { target: { value: 'DOS_CUOTAS' } });
    fireEvent.change(dialog.getByLabelText('Vencimiento cuota única'), { target: { value: `${year}-05-01` } });
    fireEvent.change(dialog.getByLabelText('Vencimiento primera cuota'), { target: { value: `${year}-05-02` } });
    fireEvent.change(dialog.getByLabelText('Vencimiento segunda cuota'), { target: { value: `${year}-08-01` } });
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar configuración' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes()).toHaveLength(1);
    expect(writes()[0].url).toBe(`/tesoreria/configuraciones/${year}`);
    expect(JSON.parse(writes()[0].data)).toEqual({ annualAmount: 65000, allowedMode: 'DOS_CUOTAS',
      annualDueDate: `${year}-05-01`, firstDueDate: `${year}-05-02`, secondDueDate: `${year}-08-01` });
  });

  it.each(['ANUAL', 'DOS_CUOTAS'])('assigns %s and generates obligations before refreshing', async mode => {
    await openPage();
    fireEvent.change(screen.getByLabelText('Familia'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Modalidad'), { target: { value: mode } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y generar cuotas' }));
    await screen.findByText('Modalidad actualizada y obligaciones regeneradas.');
    expect(writes().map(request => request.url)).toEqual(['/tesoreria/modalidades/7',
      `/tesoreria/obligaciones/generar/${year}`]);
    expect(JSON.parse(writes()[0].data)).toEqual({ year, mode });
    expect(screen.getByLabelText('Familia')).toHaveValue('0');
  });

  it('validates a custom fee and does not regenerate standard obligations', async () => {
    await openPage();
    fireEvent.change(screen.getByLabelText('Familia'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Modalidad'), { target: { value: 'PERSONALIZADA' } });
    const save = screen.getByRole('button', { name: 'Crear cuota personalizada' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '12000' } });
    fireEvent.change(screen.getByLabelText('Vencimiento'), { target: { value: `${year + 1}-01-01` } });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Vencimiento'), { target: { value: `${year}-12-01` } });
    fireEvent.click(save);
    await screen.findByText('Cuota personalizada creada.');
    expect(writes()).toHaveLength(1);
    expect(JSON.parse(writes()[0].data)).toMatchObject({ year, mode: 'PERSONALIZADA',
      customAmount: 12000, customDueDate: `${year}-12-01` });
  });

  it('records a manual payment and updates the displayed status from the server', async () => {
    await openPage();
    const normal = respond;
    respond = request => {
      if (request.url === '/tesoreria/obligaciones/12/pagos') {
        page.obligations = [{ ...obligation, status: 'PAGADA', paymentDate: `${year}-01-01` }];
      }
      return normal(request);
    };
    const dialog = await openPayment();
    fireEvent.change(dialog.getByLabelText('Fecha de pago'), { target: { value: `${year}-01-01` } });
    fireEvent.click(dialog.getByRole('button', { name: 'Registrar pago' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(JSON.parse(writes()[0].data)).toEqual({ paymentDate: `${year}-01-01`, amount: 50000 });
    expect(screen.getAllByText('PAGADA')).toHaveLength(2);
    expect(screen.getByRole('table')).toContainElement(screen.getByRole('button', { name: 'Anular' }));
  });

  it('prevents confirmation without a payment date and lets the user cancel without requests', async () => {
    await openPage();
    const dialog = await openPayment();
    fireEvent.change(dialog.getByLabelText('Fecha de pago'), { target: { value: '' } });
    expect(dialog.getByRole('button', { name: 'Registrar pago' })).toBeDisabled();
    fireEvent.click(dialog.getByRole('button', { name: 'Volver' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it.each(['PROOF_SUBMITTED', 'UNDER_REVIEW'])('approves an existing %s proof without uploading or paying twice', async status => {
    proofs = [{ id: 81, installmentId: 12, status, originalFileName: 'Transferencia.pdf' }];
    await openPage();
    await screen.findAllByText('Ver archivo');
    const dialog = await openPayment();
    expect(dialog.getByText('Transferencia.pdf')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Registrar pago' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes().map(request => request.url)).toEqual(['/tesoreria/pagos-transferencia/81/aprobar']);
  });

  it('uploads a proof then approves it, without sending a second manual payment', async () => {
    await openPage();
    const dialog = await openPayment();
    const file = new File(['proof'], 'Transferencia.pdf', { type: 'application/pdf' });
    fireEvent.change(dialog.getByLabelText('Adjuntar comprobante (opcional)'), { target: { files: [file] } });
    expect(dialog.getByText('Transferencia.pdf')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Registrar pago' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes().map(request => request.url)).toEqual([
      '/tesoreria/pagos-transferencia/obligaciones/12/comprobante', '/tesoreria/pagos-transferencia/81/aprobar']);
    expect(writes()[0].data).toBeInstanceOf(FormData);
    expect((writes()[0].data as FormData).get('file')).toBe(file);
  });

  it('keeps the payment dialog and allows retry after upload failure', async () => {
    await openPage();
    const normal = respond;
    respond = request => request.method === 'post' ? failure(request) : normal(request);
    const dialog = await openPayment();
    fireEvent.change(dialog.getByLabelText('Adjuntar comprobante (opcional)'), {
      target: { files: [new File(['proof'], 'Transferencia.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Registrar pago' }));
    await screen.findByText('No fue posible guardar el comprobante y registrar el pago.');
    expect(writes()).toHaveLength(1);
    expect(dialog.getByRole('button', { name: 'Registrar pago' })).toBeEnabled();
    respond = normal;
    fireEvent.click(dialog.getByRole('button', { name: 'Registrar pago' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes()).toHaveLength(3);
  });

  it('annuls a payment only when a reason is entered', async () => {
    page.obligations = [{ ...obligation, status: 'PAGADA' }];
    await openPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Anular' })[0]);
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Anular pago' }));
    expect(writes()).toHaveLength(0);
    fireEvent.change(dialog.getByLabelText('Motivo de la anulación'), { target: { value: '  Error de registro  ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Anular pago' }));
    await screen.findByText('Pago anulado; la cuota volvió a pendiente.');
    expect(writes()[0].url).toBe('/tesoreria/obligaciones/12/anulacion');
    expect(JSON.parse(writes()[0].data)).toEqual({ reason: 'Error de registro' });
  });

  it('removes a family plan with the year and normalized reason', async () => {
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar familia' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Quitar familia' }));
    expect(writes()).toHaveLength(0);
    fireEvent.change(dialog.getByLabelText('Motivo'), { target: { value: '  Retiro  ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Quitar familia' }));
    await screen.findByText('La familia fue quitada de la cuota anual.');
    expect(writes()[0].url).toBe('/tesoreria/modalidades/7/anulacion');
    expect(writes()[0].params).toEqual({ year });
    expect(JSON.parse(writes()[0].data)).toEqual({ reason: 'Retiro' });
  });

  it('renders the empty state and recovers after a read failure', async () => {
    const normal = respond;
    respond = request => request.url === '/tesoreria/cuotas/page' ? failure(request) : normal(request);
    await openPage();
    await screen.findByText('Configura la cuota anual para comenzar.');
    expect(screen.getByText('Aún no hay familias con modalidad configurada.')).toBeInTheDocument();
    respond = normal;
    const refresh = screen.getByRole('button', { name: /Limpiar/ });
    fireEvent.click(refresh);
    await screen.findAllByText('Ana Pérez');
    expect(screen.queryByText('Configura la cuota anual para comenzar.')).not.toBeInTheDocument();
  });
});
