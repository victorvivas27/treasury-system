import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SERVICE_UNAVAILABLE_EVENT } from '@/core/D-config/axiosInterceptor';
import { ServiceNotice } from './ServiceNotice';

afterEach(() => vi.unstubAllGlobals());

describe('ServiceNotice', () => {
  it('permite comprobar la conexión sin repetir la operación fallida', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    render(<ServiceNotice />);
    fireEvent(window, new Event(SERVICE_UNAVAILABLE_EVENT));
    expect(screen.getByText('Estamos teniendo dificultades')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar conexión' }));
    await waitFor(() => expect(screen.getByText('Ya hay conexión')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain('/service-availability');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso de conexión' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mantiene el aviso si la comprobación falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<ServiceNotice />);
    fireEvent(window, new Event('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar conexión' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar conexión' })).toBeEnabled());
    expect(screen.getByText('Estamos teniendo dificultades')).toBeInTheDocument();
  });
});
