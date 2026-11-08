import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HomeEntryTransition } from './HomeEntryTransition';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('mantiene la transición mientras los datos siguen pendientes y se desvanece al estar listos', () => {
  const onExited = vi.fn();
  const view = render(<HomeEntryTransition ready={false} onExited={onExited} />);
  act(() => vi.advanceTimersByTime(10000));
  expect(onExited).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).not.toHaveClass('is-leaving');
  view.rerender(<HomeEntryTransition ready onExited={onExited} />);
  act(() => vi.advanceTimersByTime(20));
  expect(screen.getByRole('status')).toHaveClass('is-leaving');
  expect(onExited).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(650));
  expect(onExited).toHaveBeenCalledOnce();
});

it('cancela la salida pendiente cuando se abandona la pantalla', () => {
  const onExited = vi.fn();
  const view = render(<HomeEntryTransition ready onExited={onExited} />);
  act(() => vi.advanceTimersByTime(20));
  view.unmount();
  act(() => vi.advanceTimersByTime(1000));
  expect(onExited).not.toHaveBeenCalled();
});

it('omite la espera del desvanecimiento con movimiento reducido', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const onExited = vi.fn();
  render(<HomeEntryTransition ready onExited={onExited} />);
  act(() => vi.advanceTimersByTime(20));
  expect(onExited).toHaveBeenCalledOnce();
});
