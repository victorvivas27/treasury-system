import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionsPage } from './CollectionsPage';
const { campaign, resource, useCases } = vi.hoisted(() => {
  const campaign = { id: 1, schoolYear: 2026, title: 'Paseo', expected: 1000, collected: 0, remaining: 1000, spent: 0, available: 0, incomeId: null,
    families: [{ familyId: 2, studentName: 'Ana', familyCode: 'FA-2', course: '4A', expected: 1000, paid: 0, remaining: 1000, status: 'PENDING' }], movements: [] };
  return { campaign, resource: { getSnapshot: vi.fn(), set: vi.fn(), load: vi.fn() }, useCases: { collect: vi.fn(), receipts: vi.fn(), downloadReceipt: vi.fn() } };
});
vi.mock('./collectionsCache', () => ({ collectionResource: () => resource, collectionFamilies: {}, collectionUseCases: useCases }));
vi.mock('../dashboard/dashboardCache', () => ({ useDashboardResource: () => ({ data: [campaign], loading: false }) }));
vi.mock('@/shared/ui/loading/PageTransition', () => ({ usePageEntry: vi.fn() }));
describe('Comprobantes de fondos por actividad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCases.receipts.mockResolvedValue([]);
    useCases.collect.mockResolvedValue(campaign);
    resource.getSnapshot.mockReturnValue({ data: [campaign] });
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
});
