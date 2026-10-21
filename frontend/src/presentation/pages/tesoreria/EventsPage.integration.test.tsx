import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../../../core/D-config/api';
import { clearAccessToken, clearCsrfToken } from '../../../core/D-config/axiosInterceptor';
import { EventsPage } from './EventsPage';

const originalAdapter = apiClient.defaults.adapter;
const year = new Date().getFullYear();
const participant = { course: '4A', standName: 'Cafetería', standType: 'FOOD',
  transferStatus: 'PENDING', grossShare: 30000, ownExpenses: 0, netProfit: 30000 };
const expense = { key: 'gasto-1', description: 'Insumos', amount: 10000,
  date: `${year}-01-01`, type: 'COMMON', status: 'ACTIVE', registeredBy: 'admin', deductFromSettlement: true };
let event: Record<string, any>;
let requests: InternalAxiosRequestConfig[];
let respond: (request: InternalAxiosRequestConfig) => unknown;
const writes = () => requests.filter(request => request.method !== 'get');
function reject(request: InternalAxiosRequestConfig, data?: unknown) {
  throw new AxiosError('Rejected', 'ERR_BAD_REQUEST', request, undefined,
    { data: data ?? {}, status: 422, statusText: 'Rejected', headers: {}, config: request });
}
beforeEach(() => {
  clearAccessToken(); clearCsrfToken(); requests = [];
  event = { id: 3, schoolYear: year, name: 'Fiesta familiar', eventDate: `${year}-01-01`,
    description: 'Celebración', status: 'EN_LIQUIDACION', grossRevenue: 100000,
    commonExpenses: 10000, courseExpenses: 0, netProfit: 90000, remainder: 0,
    participants: [participant], expenses: [expense] };
  respond = request => {
    if (request.url === '/tesoreria/configuracion-general/curso') return { course: '4A' };
    if (request.method === 'get') return [event];
    if (request.url?.endsWith('/liquidacion/calcular')) return {
      distributable: 90000, remainder: 0, courses: [participant] };
    return event;
  };
  apiClient.defaults.adapter = async request => {
    requests.push(request);
    const data = await respond(request);
    return { data: JSON.stringify(data), status: 200, statusText: 'OK', headers: {}, config: request };
  };
});
afterEach(() => { apiClient.defaults.adapter = originalAdapter; });
async function openPage() {
  render(<EventsPage />);
  await screen.findByRole('heading', { name: `Fiesta familiar ${year}` });
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('school events connected to HTTP', () => {
  it('loads event totals, course distribution and expenses for the selected year', async () => {
    await openPage();
    expect(screen.getByText('Insumos')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '4A' })).toBeInTheDocument();
    expect(requests.find(request => request.url === '/tesoreria/eventos')?.params).toEqual({ year });
    expect(screen.getByRole('button', { name: 'Calcular distribución' })).toBeEnabled();
  });

  it('creates an event using the configured course and normalizes participant sections', async () => {
    await openPage(); click('Crear evento');
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByLabelText('Curso administrado')).toHaveValue('4A');
    expect(dialog.getByLabelText('Curso 2')).toHaveValue('4B');
    fireEvent.change(dialog.getByLabelText('Nombre'), { target: { value: 'Bingo' } });
    fireEvent.change(dialog.getByLabelText('Nombre del stand'), { target: { value: 'Comida' } });
    fireEvent.change(dialog.getByLabelText('Curso 2'), { target: { value: '5b' } });
    fireEvent.change(dialog.getByLabelText('Descripción'), { target: { value: 'Actividad' } });
    fireEvent.change(dialog.getByLabelText('Fecha'), { target: { value: `${year}-12-01` } });
    const normal = respond;
    respond = request => request.method === 'post' ? { ...event, name: 'Bingo', id: 4 } : normal(request);
    fireEvent.click(dialog.getByRole('button', { name: 'Crear evento' }));
    await screen.findByRole('heading', { name: `Bingo ${year}` });
    expect(writes()[0].url).toBe('/tesoreria/eventos');
    expect(JSON.parse(writes()[0].data)).toMatchObject({ name: 'Bingo', schoolYear: year,
      description: 'Actividad', eventDate: `${year}-12-01`, participants: [
        { course: '4A', standName: 'Comida' }, { course: '5B', standName: 'Comida' },
        { course: '4C', standName: 'Comida' }] });
  });

  it('edits the selected event through PUT and refreshes its visible name', async () => {
    await openPage(); click('Editar evento');
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Nombre'), { target: { value: 'Fiesta corregida' } });
    const normal = respond;
    respond = request => request.method === 'put' ? { ...event, name: 'Fiesta corregida' } : normal(request);
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByRole('heading', { name: `Fiesta corregida ${year}` });
    expect(writes()[0].url).toBe('/tesoreria/eventos/3');
    expect(writes()[0].method).toBe('put');
  });

  it.each([{}, { errors: { name: 'Nombre duplicado', date: 'Fecha inválida', ignored: '' } }])(
    'preserves the event form and shows server validation or fallback on rejection: %j', async data => {
      await openPage(); click('Editar evento');
      const dialog = within(screen.getByRole('dialog'));
      respond = request => reject(request, data);
      fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
      await screen.findByRole('alert');
      expect(screen.getByRole('alert')).toHaveTextContent('errors' in data
        ? 'Nombre duplicado Fecha inválida' : 'No fue posible guardar el evento.');
      expect(dialog.getByLabelText('Nombre')).toHaveValue('Fiesta familiar');
      expect(writes()).toHaveLength(1);
    });

  it('adds a donated course expense with its category and returns updated data', async () => {
    await openPage(); click('Registrar gasto');
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Descripción'), { target: { value: 'Donación' } });
    fireEvent.change(dialog.getByLabelText('Monto'), { target: { value: '5000' } });
    fireEvent.change(dialog.getByLabelText('Tipo'), { target: { value: 'COURSE' } });
    fireEvent.change(dialog.getByLabelText('Curso'), { target: { value: '4A' } });
    fireEvent.change(dialog.getByLabelText('Categoría'), { target: { value: 'Alimentos' } });
    fireEvent.click(dialog.getByRole('checkbox'));
    const normal = respond;
    respond = request => request.method === 'post' ? { ...event, expenses: [
      { ...expense, key: 'gasto-2', description: 'Donación', type: 'COURSE', course: '4A', deductFromSettlement: false }] }
      : normal(request);
    fireEvent.click(dialog.getByRole('button', { name: 'Registrar gasto' }));
    await screen.findByText('Donación');
    expect(JSON.parse(writes()[0].data)).toMatchObject({ description: 'Donación', amount: 5000,
      type: 'COURSE', course: '4A', category: 'Alimentos', deductFromSettlement: false });
    expect(writes()[0].url).toBe('/tesoreria/eventos/3/gastos');
    expect(screen.getByText('Donado · no se descuenta')).toBeInTheDocument();
  });

  it('edits an expense and keeps the form open when the server rejects it', async () => {
    await openPage(); click('Editar');
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByLabelText('Descripción')).toHaveValue('Insumos');
    fireEvent.change(dialog.getByLabelText('Monto'), { target: { value: '20000' } });
    const normal = respond;
    respond = request => request.method === 'put' ? reject(request) : normal(request);
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText('No fue posible guardar el gasto.');
    expect(writes()[0].url).toBe('/tesoreria/eventos/3/gastos/gasto-1');
    expect(dialog.getByLabelText('Monto')).toHaveValue(20000);
    respond = normal;
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes()).toHaveLength(2);
  });

  it('saves revenue including payment method, receipt and observations', async () => {
    await openPage(); click('Editar recaudación');
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Monto total recaudado'), { target: { value: '120000' } });
    fireEvent.change(dialog.getByLabelText('Medio de pago'), { target: { value: 'TRANSFER' } });
    fireEvent.change(dialog.getByLabelText('Número de comprobante (opcional)'), { target: { value: 'R-10' } });
    fireEvent.change(dialog.getByLabelText('Observaciones (opcional)'), { target: { value: 'Verificado' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes()[0].url).toBe('/tesoreria/eventos/3/recaudacion');
    expect(JSON.parse(writes()[0].data)).toMatchObject({ amount: 120000, paymentMethod: 'TRANSFER',
      receiptNumber: 'R-10', observations: 'Verificado' });
  });

  it('does not calculate without revenue and supports first revenue registration', async () => {
    event.grossRevenue = null;
    await openPage();
    expect(screen.getByRole('button', { name: 'Calcular distribución' })).toBeDisabled();
    click('Registrar recaudación');
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Monto total recaudado'), { target: { value: '50000' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar recaudación' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(JSON.parse(writes()[0].data).amount).toBe(50000);
  });

  it('requires confirmation to delete an expense and removes it after the server succeeds', async () => {
    await openPage(); click('Eliminar');
    expect(writes()).toHaveLength(0);
    const normal = respond;
    respond = request => request.method === 'delete' ? { ...event, expenses: [] } : normal(request);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    await screen.findByText('Gasto eliminado definitivamente.');
    expect(screen.queryByText('Insumos')).not.toBeInTheDocument();
    expect(writes()[0].url).toBe('/tesoreria/eventos/3/gastos/gasto-1');
  });

  it.each(['Eliminar evento', 'Eliminar recaudación'])('can cancel %s without a write', async action => {
    await openPage(); click(action);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Volver' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it('deletes the event after confirmation and displays the empty state', async () => {
    await openPage(); click('Eliminar evento');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar evento' }));
    await screen.findByText(`No hay eventos en ${year}`);
    expect(writes()[0].method).toBe('delete');
    expect(writes()[0].url).toBe('/tesoreria/eventos/3');
  });

  it('deletes revenue and disables calculation after receiving the updated event', async () => {
    await openPage(); click('Eliminar recaudación');
    const normal = respond;
    respond = request => request.method === 'delete' ? { ...event, grossRevenue: null } : normal(request);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    await screen.findByText('Recaudación eliminada.');
    expect(screen.getByRole('button', { name: 'Calcular distribución' })).toBeDisabled();
    expect(writes()[0].url).toBe('/tesoreria/eventos/3/recaudacion');
  });

  it('previews then confirms distribution using separate HTTP requests', async () => {
    await openPage(); click('Calcular distribución');
    await screen.findByText('Total para distribuir');
    const normal = respond;
    respond = request => request.url?.endsWith('/confirmar') ? { ...event, status: 'CERRADO' } : normal(request);
    click('Confirmar distribución');
    await screen.findByText('Liquidación confirmada y transferencias registradas.');
    expect(writes().map(request => request.url)).toEqual([
      '/tesoreria/eventos/3/liquidacion/calcular', '/tesoreria/eventos/3/liquidacion/confirmar']);
    expect(screen.queryByRole('button', { name: 'Registrar gasto' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar liquidación' })).toBeInTheDocument();
  });

  it('blocks distribution with negative course balances and shows the remainder', async () => {
    await openPage();
    const normal = respond;
    respond = request => request.url?.endsWith('/calcular') ? { distributable: 1,
      remainder: 1, courses: [{ ...participant, netProfit: -100 }] } : normal(request);
    click('Calcular distribución');
    await screen.findByText('Total para distribuir');
    expect(screen.getByRole('button', { name: 'Confirmar distribución' })).toBeDisabled();
    click('Volver');
    expect(screen.queryByText('Total para distribuir')).not.toBeInTheDocument();
    expect(writes()).toHaveLength(1);
  });

  it('requires two actions to cancel a closed settlement', async () => {
    event.status = 'CERRADO';
    await openPage(); click('Cancelar liquidación');
    expect(writes()).toHaveLength(0);
    const normal = respond;
    respond = request => request.method === 'post' ? { ...event, status: 'EN_LIQUIDACION' } : normal(request);
    click('Confirmar cancelación');
    await screen.findByText('Liquidación cancelada. El evento volvió a estar en liquidación.');
    expect(writes()[0].url).toBe('/tesoreria/eventos/3/liquidacion/cancelar');
    expect(screen.getByRole('button', { name: 'Registrar gasto' })).toBeInTheDocument();
  });

  it('recovers a failed event read with the reload action', async () => {
    const normal = respond;
    respond = request => request.url === '/tesoreria/eventos' ? reject(request) : normal(request);
    render(<EventsPage />);
    await screen.findByText('No fue posible cargar los eventos.');
    respond = normal; click('Actualizar eventos');
    await screen.findByRole('heading', { name: `Fiesta familiar ${year}` });
    expect(screen.queryByText('No fue posible cargar los eventos.')).not.toBeInTheDocument();
  });

  it('changes the year at the HTTP boundary', async () => {
    await openPage(); click('Año escolar');
    fireEvent.click(screen.getByRole('option', { name: String(year + 1) }));
    await waitFor(() => expect(requests.filter(request => request.url === '/tesoreria/eventos').at(-1)?.params)
      .toEqual({ year: year + 1 }));
  });

  it.each([
    ['calculate', 'Registra una recaudación válida antes de calcular la distribución.'],
    ['confirm', 'Debes resolver remanentes o saldos negativos antes de confirmar.'],
    ['cancel', 'No fue posible cancelar la liquidación.'],
    ['revenue', 'No fue posible guardar la recaudación.'],
    ['deleteRevenue', 'No fue posible eliminar la recaudación.'],
  ])('shows a failed %s operation without claiming success', async (action, message) => {
    if (action === 'cancel') event.status = 'CERRADO';
    await openPage();
    if (action === 'confirm') {
      click('Calcular distribución');
      await screen.findByText('Total para distribuir');
    }
    const normal = respond;
    respond = request => request.method !== 'get' ? reject(request) : normal(request);
    if (action === 'calculate') click('Calcular distribución');
    if (action === 'confirm') click('Confirmar distribución');
    if (action === 'cancel') { click('Cancelar liquidación'); click('Confirmar cancelación'); }
    if (action === 'revenue') {
      click('Editar recaudación');
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }));
    }
    if (action === 'deleteRevenue') {
      click('Eliminar recaudación');
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    }
    await screen.findByText(message);
    expect(screen.getByRole('heading', { name: `Fiesta familiar ${year}` })).toBeInTheDocument();
    expect(writes()).toHaveLength(action === 'confirm' ? 2 : 1);
  });

  it.each(['Crear evento', 'Editar evento', 'Registrar gasto', 'Editar recaudación'])(
    'closes %s without sending data', async action => {
      await openPage(); click(action);
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(writes()).toHaveLength(0);
    });
});
