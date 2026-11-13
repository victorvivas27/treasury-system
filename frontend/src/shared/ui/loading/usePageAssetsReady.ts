import { useLayoutEffect, useState, type RefObject } from 'react';

function waitForImage(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const cleanup = () => {
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', settled);
      signal.removeEventListener('abort', settled);
    };
    const settled = () => { cleanup(); resolve(); };
    const loaded = () => {
      cleanup();
      // Downloading the bytes is not enough: wait until the browser can paint them.
      if (typeof image.decode === 'function') void image.decode().catch(() => undefined).then(resolve);
      else resolve();
    };
    image.addEventListener('load', loaded, { once: true });
    image.addEventListener('error', settled, { once: true });
    signal.addEventListener('abort', settled, { once: true });
    if (image.complete) {
      if (image.naturalWidth > 0) loaded();
      else settled();
    }
  });
}


// Observe only the current page, never the loader itself or later background refreshes.
export function usePageAssetsReady(page: RefObject<HTMLElement | null>, active = true) {
  const [pending, setPending] = useState(false);
  useLayoutEffect(() => {
    const root = page.current;
    if (!root || !active) return;
    type Asset = { source: string; pending: boolean; controller: AbortController };
    const assets = new Map<Element | string, Asset>();
    let disposed = false;
    const update = () => {
      if (!disposed) setPending([...assets.values()].some(asset => asset.pending));
    };
    const track = (key: Element | string, source: string, load: (signal: AbortSignal) => Promise<unknown>) => {
      if (assets.get(key)?.source === source) return;
      assets.get(key)?.controller.abort();
      const asset = { source, pending: true, controller: new AbortController() };
      assets.set(key, asset);
      void load(asset.controller.signal).catch(() => undefined).then(() => {
        if (disposed || assets.get(key) !== asset) return;
        asset.pending = false;
        update();
      });
    };
    const scan = () => {
      const present = new Set<Element | string>();
      const visit = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        if (element.hidden || style.display === 'none' || style.visibility === 'hidden') return;
        if (element instanceof HTMLImageElement && (element.currentSrc || element.getAttribute('src'))) {
          const bounds = element.getBoundingClientRect();
          // Offscreen lazy images load when scrolled into view, not during page entry.
          const deferred = element.loading === 'lazy' && (bounds.top >= innerHeight || bounds.bottom < 0);
          if (!deferred) {
            present.add(element);
            const source = [element.currentSrc, element.src, element.srcset,
              ...[...(element.closest('picture')?.querySelectorAll('source') ?? [])].map(source => source.srcset)].join('|');
            track(element, source, signal => waitForImage(element, signal));
          }
        }
        for (const match of style.backgroundImage.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) {
          const source = match[2];
          if (!source) continue;
          present.add(source);
          track(source, source, signal => {
            const image = new Image();
            image.src = source;
            return waitForImage(image, signal);
          });
        }
        for (const child of element.children) {
          if (child instanceof HTMLElement) visit(child);
        }
      };
      visit(root);
      if (document.fonts && document.fonts.status !== 'loaded') {
        present.add('fonts');
        track('fonts', 'fonts', () => document.fonts.ready);
      }
      for (const [key, asset] of assets) {
        if (!present.has(key)) { asset.controller.abort(); assets.delete(key); }
      }
      update();
    };
    const observer = new MutationObserver(scan);
    observer.observe(root, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['src', 'srcset', 'sizes', 'style', 'class', 'hidden', 'media'] });
    window.addEventListener('resize', scan);
    scan();
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', scan);
      for (const asset of assets.values()) asset.controller.abort();
    };
  }, [page, active]);
  return pending;
}
