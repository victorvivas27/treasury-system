import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionsPage } from './CollectionsPage';
import type { CollectionCampaign, CollectionFamily, CollectionMovement } from '@/core/A-domain/entities/treasury/Collection';
const { campaign, resource, useCases, auth } = vi.hoisted(() => {
  const campaign: CollectionCampaign = { id: 1, schoolYear: 2026, title: 'Paseo', defaultAmount: 1000, dueDate: null, expected: 1000, collected: 0, remaining: 1000, spent: 0, available: 0, incomeId: null,
    families: [{ familyId: 2, studentName: 'Ana', guardian: null, familyCode: 'FA-2', course: '4A', expected: 1000, paid: 0, remaining: 1000, status: 'PENDING' }], movements: [] };
  return { campaign, auth: { role: 'ADMIN', empty: false }, resource: { getSnapshot: vi.fn(), set: vi.fn(), load: vi.fn() }, useCases: { collect: vi.fn(), disburse: vi.fn(), archive: vi.fn(), receipts: vi.fn(), downloadReceipt: vi.fn() } };
});
vi.mock('@/presentation/context/AuthContext', () => ({ useAuth: () => ({ user: { rol: auth.role } }) }));
vi.mock('./collectionsCache', () => ({ collectionResource: () => resource, collectionFamilies: {}, collectionUseCases: useCases }));
vi.mock('../dashboard/dashboardCache', () => ({ useDashboardResource: () => ({ data: auth.empty ? [] : [campaign], loading: false }) }));
vi.mock('@/shared/ui/loading/PageTransition', () => ({ usePageEntry: vi.fn() }));
describe('Comprobantes de fondos por actividad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'ADMIN'; auth.empty = false;
    Object.assign(campaign, { expected: 1000, collected: 0, remaining: 1000, spent: 0, available: 0, incomeId: null });
    campaign.families = [{ familyId: 2, studentName: 'Ana', guardian: null, familyCode: 'FA-2', course: '4A', expected: 1000, paid: 0, remaining: 1000, status: 'PENDING' }];
    campaign.movements = [];
    useCases.receipts.mockResolvedValue([]);
    useCases.collect.mockResolvedValue(campaign);
    useCases.disburse.mockResolvedValue(campaign);
    useCases.archive.mockResolvedValue(undefined);
    resource.getSnapshot.mockReturnValue({ data: [campaign] });
  });
  it.each([
    { secondPaid: 0, quota: 15000, pending: 15000, received: 23000 },
    { secondPaid: 5000, quota: 20000, pending: 10000, received: 28000 },
    { secondPaid: 15000, quota: 30000, pending: 0, received: 38000 },
  ])('separates extras from quota progress when another family paid $secondPaid', async ({ secondPaid, quota, pending, received }) => {
    campaign.families = [
      { ...campaign.families[0], expected: 15000, paid: 23000, remaining: 0, status: 'PAID' },
      { familyId: 3, studentName: 'Luis', guardian: null, familyCode: 'FA-3', course: '4A', expected: 15000,
        paid: secondPaid, remaining: pending, status: secondPaid === 15000 ? 'PAID' : secondPaid ? 'PARTIAL' : 'PENDING' },
    ];
    Object.assign(campaign, { expected: 30000, collected: received, remaining: pending, available: received });
    await act(async () => { render(<MemoryRouter><CollectionsPage /></MemoryRouter>); });
    const total = (label: string) => within(screen.getByText(label, { selector: 'dt' }).parentElement!).getByRole('definition');
    const pesos = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
    expect(total('Meta')).toHaveTextContent(pesos(30000));
    expect(total('Recibido para la meta')).toHaveTextContent(pesos(quota));
    expect(total('Extra de apoderados')).toHaveTextContent(pesos(8000));
    expect(total('Falta para la meta')).toHaveTextContent(pesos(pending));
    expect(screen.getByRole('progressbar', { name: 'Avance de las cuotas' })).toHaveAttribute('value', String(quota));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Luis' } });
    expect(total('Extra de apoderados')).toHaveTextContent(pesos(8000));
    expect(total('Falta para la meta')).toHaveTextContent(pesos(pending));
  });
  it('lets users consult funds and receipts without any mutation controls', async () => {
    auth.role = 'USER';
    Object.assign(campaign.families[0], { paid: 1500, remaining: 0, status: 'PAID' });
    campaign.movements = [{ requestId: 'payment-1', familyId: 2, incomeId: null, expenseId: null,
      amount: 1500, date: '2026-01-01', reference: null, recipient: null, active: true }];
    useCases.receipts.mockResolvedValue([{ requestId: 'payment-1', originalName: 'pago.pdf' }]);
    render(<MemoryRouter><CollectionsPage /></MemoryRouter>);
    expect(screen.getByText(/Solo lectura/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Pagó Ana' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Pagó Ana' })).toBeDisabled();
    for (const name of ['Nuevo fondo', 'Editar fondo', 'Eliminar fondo', 'Cerrar y dar ingreso', 'Registrar pago proveedor', 'Agregar pago de Ana', 'Ajustar monto de Ana']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByText(/Historial ·/));
    expect(await screen.findByRole('button', { name: 'Ver comprobante' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pagó Ana' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useCases.collect).not.toHaveBeenCalled();
    expect(screen.getByRole('searchbox')).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Solo pendientes' })).toBeEnabled();
  });
  it('shows users an empty state without offering to create funds', () => {
    auth.role = 'USER'; auth.empty = true;
    render(<MemoryRouter><CollectionsPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Todavía no hay fondos por actividad' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear|Nuevo fondo/ })).not.toBeInTheDocument();
  });
  it('sends the optional receipt when confirming the payment check', async () => {
    render(<MemoryRouter><CollectionsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pagó Ana' }));
    const dialog = within(screen.getByRole('dialog'));
    const file = new File(['%PDF-1.7 prueba'], 'pago.pdf', { type: 'application/pdf' });
    fireEvent.change(dialog.getByLabelText('Adjuntar comprobante (opcional)'), { target: { files: [file] } });
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(useCases.collect).toHaveBeenCalledWith(1, 2, expect.objectContaining({ amount: 1000 }), file));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('preserves the dialog and unpaid status after upload failure', async () => {
    useCases.collect.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><CollectionsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pagó Ana' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Pagó Ana' })).not.toBeChecked();
    expect(resource.set).not.toHaveBeenCalled();
  });
  it('accepts 23000 for a family whose expected payment is 15000', async () => {
    Object.assign(campaign.families[0], { expected: 15000, remaining: 15000 });
    render(<MemoryRouter><CollectionsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pagó Ana' }));
    const dialog = within(screen.getByRole('dialog'));
    const amount = dialog.getByRole('spinbutton', { name: 'Monto en pesos' });
    fireEvent.change(amount, { target: { value: '23000' } });
    expect(amount).toBeValid();
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(useCases.collect).toHaveBeenCalledWith(1, 2, expect.objectContaining({ amount: 23000 }), undefined));
  });
  it('allows another payment after a family is already paid and displays the extra', async () => {
    Object.assign(campaign.families[0], { expected: 15000, paid: 23000, remaining: 0, status: 'PAID' });
    render(<MemoryRouter><CollectionsPage /></MemoryRouter>);
    expect(screen.getByText(/Extra:.*8.000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar pago de Ana' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByRole('spinbutton'), { target: { value: '2000' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(useCases.collect).toHaveBeenCalledWith(1, 2, expect.objectContaining({ amount: 2000 }), undefined));
  });
  it('records successive provider payments with a receipt and keeps their expenses visible', async () => {
    Object.assign(campaign, { incomeId: 51, collected: 10000, available: 10000 });
    campaign.movements = [{ requestId: 'income', familyId: null, incomeId: 51, expenseId: null, amount: 10000,
      date: '2026-01-01', reference: null, recipient: null, active: true }];
    useCases.disburse.mockImplementation(async (_id, payment) => {
      campaign.spent += payment.amount; campaign.available -= payment.amount;
      campaign.movements.push({ ...payment, familyId: null, incomeId: null, expenseId: campaign.movements.length + 100, active: true });
      return campaign;
    });
    useCases.receipts.mockImplementation(async () => campaign.movements.filter(m => m.expenseId).map(m => ({ requestId: m.requestId, originalName: 'proveedor.pdf' })));
    await act(async () => { render(<MemoryRouter><CollectionsPage /></MemoryRouter>); });
    const file = new File(['%PDF-1.7 prueba'], 'proveedor.pdf', { type: 'application/pdf' });
    for (const [supplier, amount] of [['Bus', '3000'], ['Camisetas', '2000']]) {
      fireEvent.click(screen.getByRole('button', { name: 'Registrar pago proveedor' }));
      const dialog = within(screen.getByRole('dialog'));
      const input = dialog.getByRole('spinbutton');
      expect(input).toHaveAttribute('max', String(campaign.available));
      fireEvent.change(input, { target: { value: amount } });
      fireEvent.change(dialog.getByLabelText('Nombre del proveedor'), { target: { value: supplier } });
      fireEvent.change(dialog.getByLabelText('Referencia / datos del proveedor (opcional)'), { target: { value: 'REF proveedor' } });
      fireEvent.change(dialog.getByLabelText('Adjuntar comprobante (opcional)'), { target: { files: [file] } });
      fireEvent.click(dialog.getByRole('button', { name: 'Guardar' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(useCases.disburse).toHaveBeenLastCalledWith(1, expect.objectContaining({ amount: Number(amount), recipient: supplier, reference: 'REF proveedor', category: 'TRANSPORT' }), file);
    }
    const providers = within(screen.getByRole('region', { name: 'Pagos a proveedores' }));
    expect(providers.getByText('Bus')).toBeInTheDocument();
    expect(providers.getByText('Camisetas')).toBeInTheDocument();
    await waitFor(() => expect(providers.getAllByRole('button', { name: 'Ver comprobante' })).toHaveLength(2));
    expect(providers.getAllByRole('link')).toHaveLength(2);
    expect(providers.getByRole('button', { name: 'Registrar pago proveedor' })).toBeEnabled();
    expect(campaign.available).toBe(5000);
    expect(useCases.disburse.mock.calls[0][1].requestId).not.toBe(useCases.disburse.mock.calls[1][1].requestId);
  });
  it('keeps the provider dialog and balance after a failed receipt submission', async () => {
    Object.assign(campaign, { incomeId: 51, collected: 10000, available: 10000 });
    campaign.movements = [{ requestId: 'income', familyId: null, incomeId: 51, expenseId: null, amount: 10000,
      date: '2026-01-01', reference: null, recipient: null, active: true }];
    useCases.disburse.mockRejectedValue(new Error('offline'));
    await act(async () => { render(<MemoryRouter><CollectionsPage /></MemoryRouter>); });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago proveedor' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByRole('spinbutton'), { target: { value: '3000' } });
    fireEvent.change(dialog.getByLabelText('Nombre del proveedor'), { target: { value: 'Bus' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar' }));
    await dialog.findByRole('alert');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(campaign.available).toBe(10000);
    expect(resource.set).not.toHaveBeenCalled();
  });
  it('confirms that deleting a fund also cancels its linked incomes and expenses', async () => {
    await act(async () => { render(<MemoryRouter><CollectionsPage /></MemoryRouter>); });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar fondo' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText(/se anularán sus ingresos y egresos vinculados/)).toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText('Motivo'), { target: { value: 'Fondo duplicado' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Eliminar fondo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useCases.archive).toHaveBeenCalledWith(1, 'Fondo duplicado');
    expect(resource.set).toHaveBeenCalledWith([]);
  });
  it('keeps the fund and deletion reason when cancelling its movements fails', async () => {
    useCases.archive.mockRejectedValue(new Error('offline'));
    await act(async () => { render(<MemoryRouter><CollectionsPage /></MemoryRouter>); });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar fondo' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Motivo'), { target: { value: 'Fondo duplicado' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Eliminar fondo' }));
    await dialog.findByRole('alert');
    expect(dialog.getByLabelText('Motivo')).toHaveValue('Fondo duplicado');
    expect(resource.set).not.toHaveBeenCalled();
  });
  it('orders first active registrations by date and time, preserves filters, and leaves unpaid families last', async () => {
    const family = (id: number, name: string, paid: number): CollectionFamily => ({ familyId: id, studentName: name, guardian: null,
      familyCode: `FA-${id}`, course: '4A', expected: 15000, paid, remaining: Math.max(0, 15000 - paid), status: paid >= 15000 ? 'PAID' : paid ? 'PARTIAL' : 'PENDING' });
    const movement = (id: number, date: string, recordedAt: string | null, active = true): CollectionMovement => ({ requestId: `${id}-${recordedAt}`, familyId: id,
      incomeId: null, expenseId: null, amount: 15000, date, recordedAt, reference: null, recipient: null, active });
    campaign.families = [family(1, 'Sin pago', 0), family(2, 'Segundo', 23000), family(3, 'Primero', 15000), family(4, 'Abono', 5000), family(5, 'Antiguo', 15000)];
    campaign.movements = [movement(2, '2026-01-01', '2026-11-08T14:30:00Z'), movement(3, '2026-11-08', '2026-11-08T14:00:00Z'),
      movement(4, '2026-11-08', '2026-11-08T15:00:00Z'), movement(2, '2026-01-01', '2026-11-08T13:00:00Z', false),
      movement(3, '2026-11-08', '2026-11-08T16:00:00Z'), movement(5, '2026-01-01', null)];
    const { container } = render(<MemoryRouter><CollectionsPage /></MemoryRouter>);
    const order = () => [...container.querySelectorAll('.collections-family strong')].map(node => node.textContent);
    expect(order()).toEqual(['Antiguo', 'Primero', 'Segundo', 'Abono', 'Sin pago']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo pendientes' }));
    expect(order()).toEqual(['Abono', 'Sin pago']);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Sin pago' } });
    expect(order()).toEqual(['Sin pago']);
    await waitFor(() => expect(useCases.receipts).toHaveBeenCalled());
  });
});
