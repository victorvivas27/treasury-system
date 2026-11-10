import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { InitialLoaderSettings } from './InitialLoaderSettings';
import { PageTransitionSettings } from './PageTransitionSettings';
import { readPageTransitionDuration, readPageTransitionPreferences } from '@/shared/ui/loading/pageTransitionPreferences';
import { readStartupPreferences } from '@/shared/ui/loading/startupPreferences';

beforeEach(() => { localStorage.clear(); });

it('permite guardar el fundido de la cinemática entre páginas', () => {
  render(<PageTransitionSettings />);
  const slider = screen.getByRole('slider', { name: 'Duración del fundido entre páginas' });
  expect(slider).toBeEnabled();
  fireEvent.change(slider, { target: { value: '2300' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' }));
  expect(readPageTransitionPreferences()).toMatchObject({ variant: 'cinematic', exitMs: 2300 });
});

it('guarda y restablece las transiciones sin cambiar el inicio', () => {
  render(<><InitialLoaderSettings /><PageTransitionSettings /></>);
  const startup = readStartupPreferences();
  const transitions = within(screen.getByRole('article', { name: 'Transiciones entre páginas' }));
  fireEvent.click(transitions.getByRole('radio', { name: /Video 02/ }));
  fireEvent.change(transitions.getByRole('slider'), { target: { value: '2000' } });
  fireEvent.change(screen.getByLabelText('Tiempo mínimo entre páginas'), { target: { value: '3000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' }));
  expect(readPageTransitionDuration()).toBe(3000);
  expect(readStartupPreferences()).toEqual(startup);
  fireEvent.click(screen.getAllByRole('button', { name: 'Restablecer' })[0]);
  expect(readPageTransitionDuration()).toBe(3000);
  fireEvent.click(screen.getAllByRole('button', { name: 'Restablecer' })[1]);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' }));
  expect(readPageTransitionDuration()).toBe(0);
});
