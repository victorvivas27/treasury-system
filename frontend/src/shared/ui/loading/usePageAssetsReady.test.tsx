import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PageTransitionBoundary, usePageEntry } from '@/shared/ui/loading/PageTransition';
import { clearLoaderPreferenceCache, setCachedLoaderPreference } from '@/shared/ui/loading/loaderPreferenceCache';
import { publicImages } from '@/shared/assets/publicImages';

let desktop = true;
const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
beforeEach(() => {
  desktop = true;
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(min-width: 1024px)' && desktop,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  setCachedLoaderPreference('pageTransition', { variant: 'cinematic', durationMs: 0, exitMs: 800 });
});
afterEach(() => {
  clearLoaderPreferenceCache();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
  else Reflect.deleteProperty(document, 'fonts');
});

function LoginAssets() {
  return <main style={desktop ? undefined : { backgroundImage: `url(${publicImages.loginMobile})` }}>
    <img src={publicImages.loginDesktop} alt="Ilustración" />
    <img src="/icono-tesoreria.png" alt="Logo" />
    <button>Ingresar</button>
  </main>;
}
function open() {
  render(<PageTransitionBoundary animateOnEntry><LoginAssets /></PageTransitionBoundary>);
  return [...document.querySelectorAll('main img')];
}
async function finishOpening() {
  await act(async () => {});
  act(() => vi.advanceTimersByTime(850));
}

it('keeps the loader beyond its minimum time until the hero and logo are decoded', async () => {
  const [hero, logo] = open();
  let decoded!: () => void;
  Object.defineProperty(hero, 'decode', { value: () => new Promise<void>(resolve => { decoded = resolve; }) });
  Object.defineProperty(logo, 'decode', { value: () => Promise.resolve() });
  fireEvent.load(hero);
  fireEvent.load(logo);
  await act(async () => vi.advanceTimersByTime(5000));
  expect(screen.getByRole('status')).not.toHaveClass('is-leaving');
  expect(document.querySelector('.page-transition-content')).toHaveAttribute('aria-busy', 'true');
  await act(async () => decoded());
  await finishOpening();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBeVisible();
});

it('also waits for the mobile CSS background and requests no desktop preload', async () => {
  desktop = false;
  const background = document.createElement('img');
  const createImage = vi.fn(function () { return background; });
  vi.stubGlobal('Image', createImage);
  const images = open();
  for (const image of images) fireEvent.load(image);
  await finishOpening();
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(createImage).toHaveBeenCalledOnce();
  expect(background.src).toBe(publicImages.loginMobile);
  fireEvent.load(background);
  await finishOpening();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('releases the form on image failure instead of keeping the loader forever', async () => {
  const images = open();
  for (const image of images) fireEvent.error(image);
  await finishOpening();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(document.querySelector('.page-transition-content')).toHaveAttribute('aria-busy', 'false');
});

it('waits for fonts even when every image was already cached', async () => {
  let fontsReady!: () => void;
  Object.defineProperty(document, 'fonts', { configurable: true, value: {
    ready: new Promise<void>(resolve => { fontsReady = resolve; }),
  } });
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1536);
  open();
  await finishOpening();
  expect(screen.getByRole('status')).toBeInTheDocument();
  await act(async () => fontsReady());
  await finishOpening();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('waits for images inserted by the initial data response', async () => {
  function Data({ loading }: { loading: boolean }) {
    usePageEntry(loading);
    return <main>{!loading && <img src="/course-photo.png" alt="Curso" />}</main>;
  }
  const view = render(<PageTransitionBoundary><Data loading /></PageTransitionBoundary>);
  view.rerender(<PageTransitionBoundary><Data loading={false} /></PageTransitionBoundary>);
  await act(async () => {});
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByRole('status')).not.toHaveClass('is-leaving');
  fireEvent.load(document.querySelector('main img')!);
  await finishOpening();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('ignores hidden images and does not reopen the loader during background updates', async () => {
  function Content({ updated = false }) {
    return <main><img hidden src="/unused.png" alt="Oculta" />{updated && <img src="/later.png" alt="Posterior" />}</main>;
  }
  const view = render(<PageTransitionBoundary animateOnEntry><Content /></PageTransitionBoundary>);
  await finishOpening();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  view.rerender(<PageTransitionBoundary animateOnEntry><Content updated /></PageTransitionBoundary>);
  await act(async () => {});
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('preserves the configured exit when only images need loading', async () => {
  render(<PageTransitionBoundary><main><img src="/photo.png" alt="Foto" /></main></PageTransitionBoundary>);
  expect(screen.getByRole('status')).toBeInTheDocument();
  fireEvent.load(document.querySelector('main img')!);
  await act(async () => {});
  act(() => vi.advanceTimersByTime(0));
  expect(screen.getByRole('status')).toHaveClass('is-leaving');
  act(() => vi.advanceTimersByTime(850));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
