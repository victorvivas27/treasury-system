import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ActionButton } from './ActionButton';

afterEach(() => vi.restoreAllMocks());

it('keeps only the invoked action busy until its real promise finishes', async () => {
  let finish!: () => void;
  const action = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<><ActionButton onClick={action}>Enviar</ActionButton><ActionButton>Cancelar</ActionButton></>);
  const send = screen.getByRole('button', { name: 'Enviar' });
  fireEvent.click(send);
  expect(send).toHaveAttribute('aria-busy', 'true');
  expect(send).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('aria-busy', 'false');
  fireEvent.click(send);
  expect(action).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(send).toBeEnabled();
  expect(send).toHaveAttribute('aria-busy', 'false');
});

it('freezes the idle dimensions during a controlled operation and restores inline styles', () => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(140);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(44);
  const page = render(<ActionButton style={{ flex: '1' }}>Guardar cambios</ActionButton>);
  page.rerender(<ActionButton style={{ flex: '1' }} aria-busy>Guardando…</ActionButton>);
  const button = screen.getByRole('button');
  expect(button.style.width).toBe('140px');
  expect(button.style.height).toBe('44px');
  page.rerender(<ActionButton style={{ flex: '1' }} aria-busy={false}>Guardar cambios</ActionButton>);
  expect(button.style.width).toBe('');
  expect(button.style.height).toBe('');
  expect(button.style.flex).toBe('1 1 0%');
});

it('preserves synchronous actions without starting a pending animation', () => {
  const action = vi.fn();
  render(<ActionButton onClick={action}>Abrir</ActionButton>);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  expect(action).toHaveBeenCalledTimes(1);
  expect(button).toBeEnabled();
  expect(button).toHaveAttribute('aria-busy', 'false');
});
