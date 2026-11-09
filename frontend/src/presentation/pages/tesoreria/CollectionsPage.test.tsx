import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionsPage } from './CollectionsPage';
import type { CollectionCampaign, CollectionFamily, CollectionMovement } from '@/core/A-domain/entities/treasury/Collection';
const { campaign, resource, useCases, auth } = vi.hoisted(() => {
  const campaign: CollectionCampaign = { id: 1, schoolYear: 2026, title: 'Paseo', defaultAmount: 1000, dueDate: null, expected: 1000, collected: 0, remaining: 1000, spent: 0, available: 0, incomeId: null,
    families: [{ familyId: 2, studentName: 'Ana', guardian: null, familyCode: 'FA-2', course: '4A', expected: 1000, paid: 0, remaining: 1000, status: 'PENDING' }], movements: [] };
  return { campaign, auth: { role: 'ADMIN', empty: false }, resource: { getSnapshot: vi.fn(), set: vi.fn(), load: vi.fn() }, useCases: { collect: vi.fn(), receipts: vi.fn(), downloadReceipt: vi.fn() } };
});
vi.mock('@/presentation/context/AuthContext', () => ({ useAuth: () => ({ user: { rol: auth.role } }) }));
vi.mock('./collectionsCache', () => ({ collectionResource: () => resource, collectionFamilies: {}, collectionUseCases: useCases }));
vi.mock('../dashboard/dashboardCache', () => ({ useDashboardResource: () => ({ data: auth.empty ? [] : [campaign], loading: false }) }));
vi.mock('@/shared/ui/loading/PageTransition', () => ({ usePageEntry: vi.fn() }));
describe('Comprobantes de fondos por actividad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'ADMIN'; auth.empty = false;
    campaign.families = [{ familyId: 2, studentName: 'Ana', guardian: null, familyCode: 'FA-2', course: '4A', expected: 1000, paid: 0, remaining: 1000, status: 'PENDING' }];
    campaign.movements = [];
    useCases.receipts.mockResolvedValue([]);
    useCases.collect.mockResolvedValue(campaign);
    resource.getSnapshot.mockReturnValue({ data: [campaign] });
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
    for (const name of ['Nuevo fondo', 'Editar fondo', 'Eliminar fondo', 'Cerrar y dar ingreso', 'Registrar pago al proveedor', 'Agregar pago de Ana', 'Ajustar monto de Ana']) {
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
    expect(screen.getByText('Registrado: 08/11/2026 · 11:00')).toBeInTheDocument();
    expect(screen.getByText(/Hora no disponible/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo pendientes' }));
    expect(order()).toEqual(['Abono', 'Sin pago']);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Sin pago' } });
    expect(order()).toEqual(['Sin pago']);
    await waitFor(() => expect(useCases.receipts).toHaveBeenCalled());
  });
});
