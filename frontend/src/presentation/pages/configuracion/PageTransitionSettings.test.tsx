import { setCachedLoaderPreference, clearLoaderPreferenceCache } from '@/shared/ui/loading/loaderPreferenceCache';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { InitialLoaderSettings } from './InitialLoaderSettings';
import { PageTransitionSettings } from './PageTransitionSettings';
import { readPageTransitionPreferences } from '@/shared/ui/loading/pageTransitionPreferences';
import { getCachedLoaderPreference } from '@/shared/ui/loading/loaderPreferenceCache';

vi.mock('@/presentation/hooks/useLoaderSettings', () => ({ useLoaderSettings: () => ({ loading: false, error: '' }) }));
vi.mock('@/shared/ui/loading/loaderConfiguration', () => ({
  saveLoaderPreference: vi.fn(async (section, preference) => {
    setCachedLoaderPreference(section, preference);
    return preference;
  }),
}));

beforeEach(() => { localStorage.clear(); clearLoaderPreferenceCache(); });

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
  const startup = getCachedLoaderPreference('startup');
  const transitions = within(screen.getByRole('article', { name: 'Transiciones entre páginas' }));
  fireEvent.click(transitions.getByRole('radio', { name: /Video 02/ }));
  fireEvent.change(transitions.getByRole('slider'), { target: { value: '2000' } });
  fireEvent.change(screen.getByLabelText('Tiempo mínimo entre páginas'), { target: { value: '3000' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' })); });
  expect(readPageTransitionPreferences().durationMs).toBe(3000);
  expect(getCachedLoaderPreference('startup')).toEqual(startup);
  fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' })); });
  expect(readPageTransitionPreferences().durationMs).toBe(0);
});

it('offers and saves Rising Fill as the fourth page transition without changing startup', async () => {
  render(<PageTransitionSettings />);
  const startup = getCachedLoaderPreference('startup');
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  fireEvent.click(screen.getByRole('radio', { name: /Rising Fill/ }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar transiciones' })); });
  expect(readPageTransitionPreferences()).toMatchObject({ variant: 'nneo-rising-fill', durationMs: 0 });
  expect(getCachedLoaderPreference('startup')).toEqual(startup);
});
