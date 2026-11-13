import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { InitialLoaderSettings } from './InitialLoaderSettings';
import { PageTransitionSettings } from './PageTransitionSettings';
import { readPageTransitionDuration, readPageTransitionPreferences } from '@/shared/ui/loading/pageTransitionPreferences';
import { readStartupPreferences } from '@/shared/ui/loading/startupPreferences';

vi.mock('@/presentation/hooks/useLoaderSettings', () => ({ useLoaderSettings: () => ({ loading: false, error: '' }) }));
vi.mock('@/shared/ui/loading/loaderConfiguration', () => ({
  saveLoaderPreference: vi.fn(async (section, preference) => {
    localStorage.setItem(section === 'startup' ? 'app-startup-preview' : 'app-page-transition', JSON.stringify(preference));
    return preference;
  }),
}));

beforeEach(() => { localStorage.clear(); });

it('permite guardar el fundido de la cinemática entre páginas', async () => {
  render(<PageTransitionSettings />);
  const slider = screen.getByRole('slider', { name: 'Duración del fundido entre páginas' });
  expect(slider).toBeEnabled();
  fireEvent.change(slider, { target: { value: '2300' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' })); });
  expect(readPageTransitionPreferences()).toMatchObject({ variant: 'cinematic', exitMs: 2300 });
});

it('guarda y restablece las transiciones sin cambiar el inicio', async () => {
  render(<><InitialLoaderSettings /><PageTransitionSettings /></>);
  const startup = readStartupPreferences();
  const transitions = within(screen.getByRole('article', { name: 'Transiciones entre páginas' }));
  fireEvent.click(transitions.getByRole('radio', { name: /Video 02/ }));
  fireEvent.change(transitions.getByRole('slider'), { target: { value: '2000' } });
  fireEvent.change(screen.getByLabelText('Tiempo mínimo entre páginas'), { target: { value: '3000' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' })); });
  expect(readPageTransitionDuration()).toBe(3000);
  expect(readStartupPreferences()).toEqual(startup);
  fireEvent.click(screen.getAllByRole('button', { name: 'Restablecer' })[0]);
  expect(readPageTransitionDuration()).toBe(3000);
  fireEvent.click(screen.getAllByRole('button', { name: 'Restablecer' })[1]);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' })); });
  expect(readPageTransitionDuration()).toBe(0);
});

it('offers and saves Rising Fill as the fourth page transition without changing startup', async () => {
  render(<PageTransitionSettings />);
  const startup = readStartupPreferences();
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  fireEvent.click(screen.getByRole('radio', { name: /Rising Fill/ }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' })); });
  expect(readPageTransitionPreferences()).toMatchObject({ variant: 'nneo-rising-fill', durationMs: 0 });
  expect(readStartupPreferences()).toEqual(startup);
});
