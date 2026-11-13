import { setCachedLoaderPreference, clearLoaderPreferenceCache } from '@/shared/ui/loading/loaderPreferenceCache';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PageTransitionBoundary, usePageEntry } from './PageTransition';

beforeEach(() => {
  localStorage.clear(); clearLoaderPreferenceCache();
  setCachedLoaderPreference('pageTransition', { variant: 'cinematic', durationMs: 0, exitMs: 800 });
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

it('respeta el tiempo mínimo guardado sin dejar de esperar datos más lentos', () => {
  setCachedLoaderPreference('pageTransition', { variant: 'cinematic', durationMs: 3000, exitMs: 800 });
  const view = render(<PageTransitionBoundary><Data pending /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(1000));
  view.rerender(<PageTransitionBoundary><Data pending={false} /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(1900));
  expect(screen.getByRole('status')).not.toHaveClass('is-leaving');
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('anima la entrada sin consultas y no vuelve a bloquear el formulario al actualizarse', () => {
  const view = render(<PageTransitionBoundary animateOnEntry><button>Ingresar</button></PageTransitionBoundary>);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText('Ingresar').closest('[inert]')).not.toBeNull();
  act(() => vi.advanceTimersByTime(850));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  const button = screen.getByRole('button', { name: 'Ingresar' });
  view.rerender(<PageTransitionBoundary animateOnEntry><button>Ingresar</button></PageTransitionBoundary>);
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBe(button);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

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

it('Rising Fill completes only after data and releases React content without removing its node manually', () => {
  setCachedLoaderPreference('pageTransition', { variant: 'nneo-rising-fill', durationMs: 0, exitMs: 400 });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const view = render(<PageTransitionBoundary><Data pending /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(20000));
  expect(Number(screen.getByRole('status').dataset.progress)).toBeLessThan(100);
  expect(screen.getByText('Contenido de la página').closest('[inert]')).not.toBeNull();
  view.rerender(<PageTransitionBoundary><Data pending={false} /></PageTransitionBoundary>);
  act(() => vi.advanceTimersByTime(1800));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('button')).toBeEnabled();
});

it('uses one initial Rising Fill cover and releases its readiness barrier without a second loader', () => {
  const boot = document.createElement('div'); boot.id = 'app-boot-loader'; boot.dataset.variant = 'nneo-rising-fill'; document.body.append(boot);
  try {
    const view = render(<PageTransitionBoundary><Data pending /></PageTransitionBoundary>);
    expect(document.querySelector('.page-entry-visual')).toBeNull();
    expect(screen.getByText('Contenido de la página').closest('[inert]')).not.toBeNull();
    view.rerender(<PageTransitionBoundary><Data pending={false} /></PageTransitionBoundary>);
    expect(screen.getByText('Contenido de la página').closest('[inert]')).toBeNull();
    expect(boot.isConnected).toBe(true);
  } finally { boot.remove(); }
});
