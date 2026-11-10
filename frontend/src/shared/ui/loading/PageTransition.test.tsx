import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PageTransitionBoundary, usePageEntry } from './PageTransition';
import { PAGE_TRANSITION_PREFERENCES_KEY } from './pageTransitionPreferences';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

it('respeta el tiempo mínimo guardado sin dejar de esperar datos más lentos', () => {
  localStorage.setItem(PAGE_TRANSITION_PREFERENCES_KEY, JSON.stringify({ durationMs: 3000 }));
  const view = render(<PageTransitionBoundary><Data pending /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(1000));
  view.rerender(<PageTransitionBoundary><Data pending={false} /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(1900));
  expect(screen.getByRole('status')).not.toHaveClass('is-leaving');
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function Data({ pending, error = false }: { pending: boolean; error?: boolean }) {
  usePageEntry(pending, error);
  return <button>{error ? 'Reintentar' : 'Contenido de la página'}</button>;
}

it('mantiene la página montada e inerte hasta que sus datos están listos', () => {
  const view = render(<PageTransitionBoundary><Data pending /></PageTransitionBoundary>);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText('Contenido de la página').closest('[inert]')).not.toBeNull();
  view.rerender(<PageTransitionBoundary><Data pending={false} /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(850));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('button')).toBeEnabled();
  view.rerender(<PageTransitionBoundary><Data pending /></PageTransitionBoundary>);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('entra directamente con caché y no abre la transición durante una actualización posterior', () => {
  const view = render(<PageTransitionBoundary><Data pending={false} /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(20));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  view.rerender(<PageTransitionBoundary><Data pending /></PageTransitionBoundary>);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('espera todas las consultas iniciales y libera la página si una falla', () => {
  const view = render(<PageTransitionBoundary><Data pending /><Data pending /></PageTransitionBoundary>);
  view.rerender(<PageTransitionBoundary><Data pending={false} /><Data pending /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('status')).toBeInTheDocument();
  view.rerender(<PageTransitionBoundary><Data pending={false} /><Data pending error /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(700));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
});
