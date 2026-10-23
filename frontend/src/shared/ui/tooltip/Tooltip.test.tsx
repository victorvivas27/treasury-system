import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';
describe('Tooltip accessibility', () => {
  it('does not restore an old tooltip when its collapsed sidebar trigger is enabled again', () => {
    const view = render(<button>Calendario<Tooltip content="Calendario Académico" /></button>);
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    view.rerender(<button>Calendario<Tooltip content="Calendario Académico" disabled /></button>);
    view.rerender(<button>Calendario<Tooltip content="Calendario Académico" /></button>);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
  it('dismisses a clicked tooltip when the mouse leaves', async () => {
    const user = userEvent.setup();
    render(<button>Ayuda<Tooltip content="Detalle" /></button>);
    const button = screen.getByRole('button');
    await user.hover(button);
    await user.click(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.unhover(button);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });
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
