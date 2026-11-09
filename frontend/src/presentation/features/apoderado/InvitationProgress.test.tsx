import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationProgress } from './InvitationProgress';

const getDelivery = vi.hoisted(() => vi.fn());
vi.mock('@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl', () => ({
  ApoderadoRepositoryImpl: class { getInvitationDelivery = getDelivery; },
}));

describe('Progreso de invitación', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('espera la confirmación del servidor y permite consultar sin reenviar', async () => {
    getDelivery.mockResolvedValueOnce({ status: 'SENT', createdAt: null, updatedAt: null })
      .mockResolvedValue({ status: 'DELIVERED', createdAt: null, updatedAt: null });
    render(<InvitationProgress codigo="AP-ABC12345" phase="sent" />);
    expect(await screen.findByText(/Esperando confirmación/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar estado' }));
    expect(await screen.findByText(/El servidor del destinatario aceptó/)).toBeInTheDocument();
    expect(screen.getByText(/Puede estar en Spam/)).toBeInTheDocument();
  });

  it('no presenta una demora como entregado', async () => {
    getDelivery.mockResolvedValue({ status: 'DELAYED', createdAt: null, updatedAt: null });
    render(<InvitationProgress codigo="AP-ABC12345" phase="sent" />);
    expect(await screen.findByText(/La entrega está demorada/)).toBeInTheDocument();
    expect(screen.queryByText(/El servidor del destinatario aceptó/)).not.toBeInTheDocument();
  });

  it('un error de consulta no se confunde con un correo rechazado', async () => {
    getDelivery.mockRejectedValue(new Error('Network error'));
    render(<InvitationProgress codigo="AP-ABC12345" phase="sent" />);
    expect(await screen.findByText(/Esto no significa que el correo haya fallado/)).toBeInTheDocument();
    expect(screen.queryByText(/El servidor rechazó/)).not.toBeInTheDocument();
  });

  it('al reenviar no reutiliza la confirmación de un envío anterior', async () => {
    getDelivery.mockResolvedValueOnce({ status: 'DELIVERED', createdAt: null, updatedAt: null });
    const view = render(<InvitationProgress codigo="AP-ABC12345" phase="idle" />);
    expect(await screen.findByText(/El servidor del destinatario aceptó/)).toBeInTheDocument();
    view.rerender(<InvitationProgress codigo="AP-ABC12345" phase="sending" />);
    expect(screen.getByText(/Preparando y enviando/)).toBeInTheDocument();
    getDelivery.mockResolvedValue({ status: 'SENT', createdAt: null, updatedAt: null });
    view.rerender(<InvitationProgress codigo="AP-ABC12345" phase="sent" />);
    await waitFor(() => expect(screen.getByText(/Esperando confirmación/)).toBeInTheDocument());
    expect(screen.queryByText(/El servidor del destinatario aceptó/)).not.toBeInTheDocument();
  });

  it('muestra el rechazo y no mantiene el estado de espera', async () => {
    getDelivery.mockResolvedValue({ status: 'BOUNCED', createdAt: null, updatedAt: null });
    render(<InvitationProgress codigo="AP-ABC12345" phase="sent" />);
    expect(await screen.findByText(/El servidor rechazó el correo/)).toBeInTheDocument();
    expect(screen.queryByText(/Esperando confirmación/)).not.toBeInTheDocument();
  });
});
