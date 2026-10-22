import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';
describe('Tooltip accessibility', () => {
  it('opens on focus, describes its trigger and closes on Escape', () => {
    render(<button aria-describedby="existing">Ayuda<Tooltip content="Descripción completa" /></button>);
    const button = screen.getByRole('button');
    fireEvent.focusIn(button);
    const tooltip = screen.getByRole('tooltip');
    expect(button.getAttribute('aria-describedby')).toContain(tooltip.id);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
  it('supports touch click and restores descriptions when removed', () => {
    const { unmount } = render(<button>Ayuda<Tooltip content="Detalle táctil" /></button>);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Detalle táctil');
    unmount();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
