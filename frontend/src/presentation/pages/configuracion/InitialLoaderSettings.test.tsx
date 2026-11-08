import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InitialLoaderSettings } from './InitialLoaderSettings';
import { readStartupPreferences, STARTUP_PREFERENCES_KEY } from '@/shared/ui/loading/startupPreferences';

beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/configuration'); });
afterEach(() => vi.restoreAllMocks());

it('saves the selected experience and timing for subsequent startup', () => {
  render(<InitialLoaderSettings />);
  fireEvent.click(screen.getByRole('radio', { name: /Cinemática/ }));
  fireEvent.change(screen.getByLabelText('Tiempo de prueba'), { target: { value: '5000' } });
  expect(screen.getByRole('slider')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' }));
  expect(readStartupPreferences()).toEqual({ variant: 'cinematic', durationMs: 5000, exitMs: 1400 });
  expect(screen.getByRole('status')).toHaveTextContent('guardada');
});

it('keeps the accepted video dissolve as the default and allows restoring it', () => {
  localStorage.setItem(STARTUP_PREFERENCES_KEY, JSON.stringify({ variant: 'video', durationMs: 5000, exitMs: 2500 }));
  render(<InitialLoaderSettings />);
  fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
  expect(screen.getByRole('slider')).toHaveValue('1400');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' }));
  expect(readStartupPreferences()).toEqual({ variant: 'video', durationMs: 10000, exitMs: 1400 });
});

it('reports storage failures without claiming the preference was saved', () => {
  render(<InitialLoaderSettings />);
  fireEvent.click(screen.getByRole('radio', { name: /Cinemática/ }));
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked'); });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' }));
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('rejects malformed storage and bounds imported timing values', () => {
  localStorage.setItem(STARTUP_PREFERENCES_KEY, '{');
  expect(readStartupPreferences().variant).toBe('video');
  localStorage.setItem(STARTUP_PREFERENCES_KEY, JSON.stringify({ variant: 'original', durationMs: 90000, exitMs: -10 }));
  expect(readStartupPreferences()).toEqual({ variant: 'video', durationMs: 20000, exitMs: 400 });
});

it('offers video 02 as a third option with the configurable dissolve', () => {
  render(<InitialLoaderSettings />);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  fireEvent.click(screen.getByRole('radio', { name: /Video 02/ }));
  expect(screen.getByRole('slider')).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' }));
  expect(readStartupPreferences().variant).toBe('video-light');
});
