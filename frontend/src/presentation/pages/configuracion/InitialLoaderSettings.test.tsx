import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { InitialLoaderSettings } from './InitialLoaderSettings';

vi.mock('@/shared/ui/loading/PageEntryVisual', () => ({
  PageEntryVisual: ({ onExited }: { onExited: () => void }) =>
    <button onClick={onExited}>Cerrar vista previa</button>,
}));

it('describes the fixed boot counter without offering server configuration', () => {
  render(<InitialLoaderSettings />);
  expect(screen.getByText('Fijo')).toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Guardar/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Probar inicio' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista previa' }));
  expect(screen.queryByRole('button', { name: 'Cerrar vista previa' })).not.toBeInTheDocument();
});
