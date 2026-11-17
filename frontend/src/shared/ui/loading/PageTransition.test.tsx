import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { PageTransitionBoundary, PageTransitionOutlet, usePageEntry } from './PageTransition';

afterEach(async () => { await act(async () => document.getElementById('app-boot-loader')?.remove()); });
function Data({ pending, error = false }: { pending: boolean; error?: boolean }) {
  usePageEntry(pending, error);
  return <button>{error ? 'Reintentar' : 'Contenido'}</button>;
}
it('keeps content accessible while data loads without opening a page loader', () => {
  const view = render(<PageTransitionBoundary><Data pending /></PageTransitionBoundary>);
  expect(screen.getByRole('button', { name: 'Contenido' })).toBeEnabled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(document.querySelector('[inert]')).toBeNull();
  expect(document.querySelector('.page-transition-content')).toHaveAttribute('aria-busy', 'true');
  view.rerender(<PageTransitionBoundary><Data pending={false} /></PageTransitionBoundary>);
  expect(document.querySelector('.page-transition-content')).toHaveAttribute('aria-busy', 'false');
});
it('reports initial readiness to the one existing boot loader without creating another cover', () => {
  const boot = document.createElement('div'); boot.id = 'app-boot-loader'; document.body.append(boot);
  const view = render(<PageTransitionBoundary><Data pending /><Data pending /></PageTransitionBoundary>);
  expect(document.querySelector('[data-page-assets-pending="true"]')).not.toBeNull();
  view.rerender(<PageTransitionBoundary><Data pending={false} /><Data pending /></PageTransitionBoundary>);
  expect(document.querySelector('[data-page-assets-pending="true"]')).not.toBeNull();
  view.rerender(<PageTransitionBoundary><Data pending={false} /><Data pending error /></PageTransitionBoundary>);
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
  expect(document.querySelector('.page-entry-visual')).toBeNull();
  expect(boot.isConnected).toBe(true);
});
it('navigates home to settings and back repeatedly without a loader or lost cached content', () => {
  render(<MemoryRouter><Routes><Route element={<PageTransitionOutlet />}>
    <Route path="/" element={<><h1>Home preparado</h1><Link to="/configuration">Configuraci?n</Link></>} />
    <Route path="/configuration" element={<><h1>Configuraci?n preparada</h1><Link to="/">Home</Link></>} />
  </Route></Routes></MemoryRouter>);
  for (let visit = 0; visit < 2; visit++) {
    fireEvent.click(screen.getByRole('link', { name: 'Configuraci?n' }));
    expect(screen.getByRole('heading', { name: 'Configuraci?n preparada' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(screen.getByRole('heading', { name: 'Home preparado' })).toBeVisible();
    expect(document.querySelector('.page-entry-visual, [inert]')).toBeNull();
  }
});
it('does not cover the page again during later refreshes or failures', () => {
  const view = render(<PageTransitionBoundary><Data pending={false} /></PageTransitionBoundary>);
  act(() => {});
  view.rerender(<PageTransitionBoundary><Data pending /></PageTransitionBoundary>);
  expect(screen.getByRole('button', { name: 'Contenido' })).toBeVisible();
  view.rerender(<PageTransitionBoundary><Data pending error /></PageTransitionBoundary>);
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
