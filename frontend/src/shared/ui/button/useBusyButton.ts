import { useLayoutEffect, useRef } from 'react';

/** Keep the idle button's dimensions while its pending content is displayed. */
export function useBusyButton(busy: boolean) {
  const ref = useRef<HTMLButtonElement>(null);
  const idleSize = useRef<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!busy) {
      const measure = () => { idleSize.current = { width: element.offsetWidth, height: element.offsetHeight }; };
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }
    const size = idleSize.current;
    if (!size?.width || !size.height) return;
    const previous = { width: element.style.width, height: element.style.height,
      boxSizing: element.style.boxSizing, maxWidth: element.style.maxWidth, flex: element.style.flex };
    Object.assign(element.style, { width: `${size.width}px`, height: `${size.height}px`,
      boxSizing: 'border-box', maxWidth: '100%', flex: '0 1 auto' });
    return () => { Object.assign(element.style, previous); };
  }, [busy]);
  return ref;
}
