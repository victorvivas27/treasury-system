import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source from './initialLoader.js?raw';

const visual = { stop: vi.fn(), finish: vi.fn(), setProgress: vi.fn() };
const createVisual = vi.fn((_loader: HTMLElement, _options?: unknown) => visual);
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  localStorage.clear();
  document.body.innerHTML = '<template id="app-boot-template"><div id="app-boot-loader"></div></template><div id="root"></div>';
  document.getElementById('root')!.inert = false;
});
afterEach(() => {
  window.dispatchEvent(new Event('app:boot-ready'));
  vi.useRealTimers();
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
});
function start() {
  new Function('createNneoRisingFill', source)(createVisual);
}

it('starts the same counter immediately without storage, URL or server settings', () => {
  localStorage.setItem('app-startup-preview', JSON.stringify({ variant: 'video' }));
  window.history.replaceState({}, '', '/?loader=video&loaderDelay=20000&loaderSound=1');
  start();
  expect(document.getElementById('app-boot-loader')).toHaveAttribute('data-variant', 'nneo-rising-fill');
  expect(createVisual).toHaveBeenCalledOnce();
  expect(createVisual.mock.calls[0]?.[1]).toMatchObject({ exitMs: 800, soundEnabled: false });
  expect(document.getElementById('root')?.inert).toBe(true);
  window.dispatchEvent(new CustomEvent('app:loader-settings', { detail: {
    section: 'startup', preference: { variant: 'video', durationMs: 20000, exitMs: 3000 },
  } }));
  expect(createVisual).toHaveBeenCalledOnce();
  expect(document.getElementById('app-boot-loader')).toHaveAttribute('data-variant', 'nneo-rising-fill');
});

it('waits for app readiness, forwards progress and releases the page after opening', () => {
  start();
  window.dispatchEvent(new CustomEvent('app:boot-progress', { detail: { progress: 65 } }));
  expect(visual.setProgress).toHaveBeenCalledWith(65);
  expect(visual.finish).not.toHaveBeenCalled();
  window.dispatchEvent(new Event('app:boot-ready'));
  expect(visual.finish).toHaveBeenCalledOnce();
  const options = createVisual.mock.calls[0]?.[1] as { onExited: () => void };
  options.onExited();
  expect(document.getElementById('app-boot-loader')).toBeNull();
  expect(document.getElementById('root')?.inert).toBe(false);
});

it('shows recovery and restores interaction if startup stalls', () => {
  start();
  vi.advanceTimersByTime(30000);
  expect(visual.stop).toHaveBeenCalledOnce();
  expect(document.getElementById('app-boot-loader')).toHaveAttribute('role', 'alert');
  expect(document.getElementById('root')?.inert).toBe(false);
});
