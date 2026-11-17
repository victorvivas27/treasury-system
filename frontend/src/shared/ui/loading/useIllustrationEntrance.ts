import { useEffect, useState, type RefObject } from 'react';
import { usePageAssetsReady } from './usePageAssetsReady';

// Begin after decoding and after the initial cover leaves, including cached images.
export function useIllustrationEntrance(root: RefObject<HTMLElement | null>) {
  const [ready, setReady] = useState(false);
  const pending = usePageAssetsReady(root, !ready);
  useEffect(() => {
    if (ready || pending) return;
    let firstFrame = 0;
    let secondFrame = 0;
    let cancelled = false;
    let decoded = false;
    const reveal = () => {
      if (cancelled || !decoded) return;
      if (document.getElementById('app-boot-loader')) return;
      observer.disconnect();
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setReady(true));
      });
    };
    const observer = new MutationObserver(reveal);
    observer.observe(document.body, { childList: true });
    // The mobile login artwork lives on ::before rather than on an <img>.
    const background = root.current ? getComputedStyle(root.current, '::before').backgroundImage : '';
    const sources = [...background.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)].map(([, , source]) => source);
    const images = sources.map(source => {
      const image = new Image();
      image.fetchPriority = 'high';
      return new Promise<void>(resolve => {
        image.onload = () => {
          if (image.decode) void image.decode().catch(() => undefined).then(() => resolve());
          else resolve();
        };
        image.onerror = () => resolve();
        image.src = source;
      });
    });
    void Promise.all(images).then(() => { decoded = true; reveal(); });
    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [pending, ready, root]);
  return ready;
}
