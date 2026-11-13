import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNneoRisingFill } from './nneoRisingFill.js';

let reduced = false;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    font: '', measureText: () => ({ actualBoundingBoxAscent: 260, actualBoundingBoxDescent: 5 }),
  } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
const setup = (onExited = vi.fn()) => {
  const loader = document.createElement('div');
  loader.dataset.variant = 'nneo-rising-fill';
  document.body.append(loader);
  return { loader, onExited, visual: createNneoRisingFill(loader, { exitMs: 800, onExited }) };
};

describe('Rising Fill', () => {
  it('spreads estimated progress out and finishes smoothly when a quick load is ready', () => {
    const { loader, visual } = setup();
    vi.advanceTimersByTime(2000);
    expect(Number(loader.dataset.progress)).toBeGreaterThan(10);
    expect(Number(loader.dataset.progress)).toBeLessThan(35);
    visual.finish();
    vi.advanceTimersByTime(250);
    expect(Number(loader.dataset.progress)).toBeLessThan(99);
    vi.advanceTimersByTime(800);
    expect(loader.dataset.progress).toBe('100');
    visual.stop();
  });
  it('stops below 100 while data is pending and does not reveal the app', () => {
    const { loader, visual, onExited } = setup();
    expect(loader.dataset.progress).toBe('0');
    expect(loader.querySelector('.nneo-rising-outline')).toHaveTextContent('000');
    vi.advanceTimersByTime(30000);
    expect(Number(loader.dataset.progress)).toBeLessThan(100);
    expect(loader.dataset.risingStage).toBe('loading');
    expect(onExited).not.toHaveBeenCalled();
    visual.stop();
  });
  it.each([[0, '000', 'INICIANDO'], [29, '029', 'INICIANDO'], [30, '030', 'INGRESANDO A TESORERÍA'],
    [65, '065', 'INGRESANDO A TESORERÍA'], [70, '070', 'PREPARANDO TU ESPACIO'], [99, '099', 'PREPARANDO TU ESPACIO']] as const)(
    'uses one progress value for %s percent, glyph fill and the horizontal arrow', (progress, digits, message) => {
      const { loader, visual } = setup();
      visual.setProgress(progress);
      expect(loader.querySelector('.nneo-rising-outline')).toHaveTextContent(digits);
      expect(loader.querySelector('.nneo-rising-mask')).toHaveTextContent(digits);
      expect(loader.querySelector('.is-current')).toHaveTextContent(message);
      const fill = loader.querySelector('rect')!;
      expect(Number(fill.getAttribute('height'))).toBeCloseTo(265 * progress / 100);
      expect(loader.querySelector('.nneo-rising-indicator')).toHaveAttribute('transform', `translate(0 ${fill.getAttribute('y')})`);
      expect(fill.getAttribute('clip-path')).toMatch(/^url\(#nneo-digits-/);
      visual.stop();
    });
  it('gates externally measured 100 percent until ready and reveals only after the final title', () => {
    const { loader, visual, onExited } = setup();
    visual.setProgress(100);
    expect(loader.dataset.progress).toBe('99');
    visual.finish();
    vi.advanceTimersByTime(270);
    expect(loader.dataset.progress).toBe('100');
    expect(loader.dataset.risingStage).toBe('complete');
    expect(onExited).not.toHaveBeenCalled();
    vi.advanceTimersByTime(370);
    expect(loader.dataset.risingStage).toBe('ready');
    expect(loader.querySelector('.nneo-rising-finale')).toHaveAttribute('aria-hidden', 'false');
    vi.advanceTimersByTime(600);
    expect(loader.dataset.risingStage).toBe('opening');
    expect(onExited).not.toHaveBeenCalled();
    vi.advanceTimersByTime(800);
    expect(onExited).toHaveBeenCalledOnce();
  });
  it('cancels all animation and exit callbacks when unmounted or aborted', () => {
    const { visual, onExited } = setup();
    visual.finish(); vi.advanceTimersByTime(500); visual.stop();
    vi.advanceTimersByTime(5000);
    expect(onExited).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('replaces estimated progress with the first measured value and then stays monotonic', () => {
    const { loader, visual } = setup();
    vi.advanceTimersByTime(10000);
    visual.setProgress(65);
    expect(loader.dataset.progress).toBe('65');
    visual.setProgress(40);
    expect(loader.dataset.progress).toBe('65');
    visual.stop();
  });
  it('uses an immediate, motion-free exit after readiness with reduced motion', () => {
    reduced = true;
    const { loader, visual, onExited } = setup();
    vi.advanceTimersByTime(1000);
    expect(loader.dataset.progress).toBe('0');
    expect(onExited).not.toHaveBeenCalled();
    visual.finish();
    expect(loader.dataset.progress).toBe('100');
    expect(onExited).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it.each(['running', 'suspended'])('plays the optional sound only when browser audio is %s', state => {
  const start = vi.fn();
  const close = vi.fn().mockResolvedValue(undefined);
  const audio = {
    state, currentTime: 0, destination: {}, close,
    createOscillator: () => ({ type: '', frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start, stop: vi.fn() }),
    createGain: () => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }),
  };
  vi.stubGlobal('AudioContext', class { constructor() { return audio; } });
  const loader = document.createElement('div');
  document.body.append(loader);
  const visual = createNneoRisingFill(loader, { soundEnabled: true, exitMs: 400 });
  visual.setProgress(99);
  visual.finish();
  vi.advanceTimersByTime(1300);
  expect(start).toHaveBeenCalledTimes(state === 'running' ? 2 : 0);
  visual.stop();
  expect(close).toHaveBeenCalledOnce();
});
