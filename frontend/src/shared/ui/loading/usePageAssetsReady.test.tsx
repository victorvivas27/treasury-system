import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PageTransitionBoundary, usePageEntry } from '@/shared/ui/loading/PageTransition';
import { clearLoaderPreferenceCache, setCachedLoaderPreference } from '@/shared/ui/loading/loaderPreferenceCache';
import { publicImages } from '@/shared/assets/publicImages';

let desktop = true;
const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
beforeEach(() => {
  desktop = true;
  const boot = document.createElement('div'); boot.id = 'app-boot-loader'; document.body.append(boot);
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(min-width: 1024px)' && desktop,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  setCachedLoaderPreference('pageTransition', { variant: 'cinematic', durationMs: 0, exitMs: 800 });
});
afterEach(async () => {
  await act(async () => document.getElementById('app-boot-loader')?.remove());
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
  render(<PageTransitionBoundary><LoginAssets /></PageTransitionBoundary>);
  return [...document.querySelectorAll('main img')];
}
async function finishOpening() {
  await act(async () => {});
  act(() => vi.advanceTimersByTime(850));
}

it('keeps the boot readiness barrier until the hero and logo are decoded', async () => {
  const [hero, logo] = open();
  let decoded!: () => void;
  Object.defineProperty(hero, 'decode', { value: () => new Promise<void>(resolve => { decoded = resolve; }) });
  Object.defineProperty(logo, 'decode', { value: () => Promise.resolve() });
  fireEvent.load(hero);
  fireEvent.load(logo);
  await act(async () => vi.advanceTimersByTime(5000));
  expect(document.querySelector('[data-page-assets-pending="true"]')).not.toBeNull();
  expect(document.querySelector('.page-transition-content')).toHaveAttribute('aria-busy', 'true');
  await act(async () => decoded());
  await finishOpening();
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
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
  expect(document.querySelector('[data-page-assets-pending="true"]')).not.toBeNull();
  expect(createImage).toHaveBeenCalledOnce();
  expect(background.src).toBe(new URL(publicImages.loginMobile, window.location.href).href);
  fireEvent.load(background);
  await finishOpening();
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
});

it('releases the form on image failure instead of keeping the loader forever', async () => {
  const images = open();
  for (const image of images) fireEvent.error(image);
  await finishOpening();
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
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
  expect(document.querySelector('[data-page-assets-pending="true"]')).not.toBeNull();
  await act(async () => fontsReady());
  await finishOpening();
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
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
  expect(document.querySelector('[data-page-assets-pending="true"]')).not.toBeNull();
  fireEvent.load(document.querySelector('main img')!);
  await finishOpening();
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
});

it('ignores hidden images and does not reopen the loader during background updates', async () => {
  function Content({ updated = false }) {
    return <main><img hidden src="/unused.png" alt="Oculta" />{updated && <img src="/later.png" alt="Posterior" />}</main>;
  }
  const view = render(<PageTransitionBoundary><Content /></PageTransitionBoundary>);
  await finishOpening();
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
  document.getElementById('app-boot-loader')?.remove();
  await act(async () => {});
  view.rerender(<PageTransitionBoundary><Content updated /></PageTransitionBoundary>);
  await act(async () => {});
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
});

it('reports image readiness without adding a navigation cover', async () => {
  render(<PageTransitionBoundary><main><img src="/photo.png" alt="Foto" /></main></PageTransitionBoundary>);
  expect(document.querySelector('[data-page-assets-pending="true"]')).not.toBeNull();
  fireEvent.load(document.querySelector('main img')!);
  await act(async () => {});
  act(() => vi.advanceTimersByTime(0));
  expect(document.querySelector('.page-entry-visual')).toBeNull();
  act(() => vi.advanceTimersByTime(850));
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
});

it('does not open the entry loader again for cached images on a return visit', async () => {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(80);
  const page = () => <PageTransitionBoundary><main><img src="/avatar.png" alt="Avatar" /></main></PageTransitionBoundary>;
  const first = render(page());
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
  await act(async () => {});
  first.unmount();
  render(page());
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
  await act(async () => {});
  expect(document.querySelector('[data-page-assets-pending="true"]')).toBeNull();
});
