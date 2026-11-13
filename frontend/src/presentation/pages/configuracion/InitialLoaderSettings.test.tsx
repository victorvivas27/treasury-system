import { saveLoaderPreference } from '@/shared/ui/loading/loaderConfiguration';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InitialLoaderSettings } from './InitialLoaderSettings';
import { readStartupPreferences, STARTUP_PREFERENCES_KEY } from '@/shared/ui/loading/startupPreferences';

vi.mock('@/presentation/hooks/useLoaderSettings', () => ({ useLoaderSettings: () => ({ loading: false, error: '' }) }));
vi.mock('@/shared/ui/loading/loaderConfiguration', () => ({
  saveLoaderPreference: vi.fn(async (section, preference) => {
    localStorage.setItem(section === 'startup' ? 'app-startup-preview' : 'app-page-transition', JSON.stringify(preference));
    return preference;
  }),
}));

beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/configuration'); });
afterEach(() => vi.restoreAllMocks());

it('saves the selected experience and timing for subsequent startup', async () => {
  render(<InitialLoaderSettings />);
  fireEvent.click(screen.getByRole('radio', { name: /Cinemática/ }));
  fireEvent.change(screen.getByLabelText('Tiempo de prueba'), { target: { value: '5000' } });
  expect(screen.getByRole('slider')).toBeDisabled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' })); });
  expect(readStartupPreferences()).toEqual({ variant: 'cinematic', durationMs: 5000, exitMs: 1400 });
  expect(screen.getByRole('status')).toHaveTextContent('guardada');
});

it('keeps the accepted video dissolve as the default and allows restoring it', async () => {
  localStorage.setItem(STARTUP_PREFERENCES_KEY, JSON.stringify({ variant: 'video', durationMs: 5000, exitMs: 2500 }));
  render(<InitialLoaderSettings />);
  fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
  expect(screen.getByRole('slider')).toHaveValue('1400');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' })); });
  expect(readStartupPreferences()).toEqual({ variant: 'video', durationMs: 10000, exitMs: 1400 });
});

it('reports server failures without claiming the preference was saved', async () => {
  render(<InitialLoaderSettings />);
  fireEvent.click(screen.getByRole('radio', { name: /Cinemática/ }));
  vi.mocked(saveLoaderPreference).mockRejectedValueOnce(Error('server unavailable'));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' })); });
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('rejects malformed storage and bounds imported timing values', async () => {
  localStorage.setItem(STARTUP_PREFERENCES_KEY, '{');
  expect(readStartupPreferences().variant).toBe('video');
  localStorage.setItem(STARTUP_PREFERENCES_KEY, JSON.stringify({ variant: 'original', durationMs: 90000, exitMs: -10 }));
  expect(readStartupPreferences()).toEqual({ variant: 'video', durationMs: 20000, exitMs: 400 });
});

it('preserves video 02 alongside the fourth option with the configurable dissolve', async () => {
  render(<InitialLoaderSettings />);
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  fireEvent.click(screen.getByRole('radio', { name: /Video 02/ }));
  expect(screen.getByRole('slider')).toBeEnabled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' })); });
  expect(readStartupPreferences().variant).toBe('video-light');
});

it('saves Rising Fill in the existing preference without imposing the video preview delay', async () => {
  render(<InitialLoaderSettings />);
  fireEvent.click(screen.getByRole('radio', { name: /Rising Fill/ }));
  expect(screen.getByLabelText('Tiempo de prueba')).toHaveValue('0');
  expect(screen.getByRole('slider', { name: 'Duración de la apertura de paneles' })).toBeEnabled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' })); });
  expect(readStartupPreferences()).toEqual({ variant: 'nneo-rising-fill', durationMs: 0, exitMs: 1400 });
});

it('keeps sound off by default and persists the optional opening sound', async () => {
  render(<InitialLoaderSettings />);
  fireEvent.click(screen.getByRole('radio', { name: /Rising Fill/ }));
  const sound = screen.getByRole('checkbox', { name: 'Sonido suave al abrir' });
  expect(sound).not.toBeChecked();
  fireEvent.click(sound);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' })); });
  expect(readStartupPreferences().soundEnabled).toBe(true);
});
