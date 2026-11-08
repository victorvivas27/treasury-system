import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { useBusyButton } from './useBusyButton';
import './ActionFeedback.css';

/** Native button styling with the same pending feedback as the shared Button. */
export function ActionButton({ onClick, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const busy = pending || props['aria-busy'] === true || props['aria-busy'] === 'true';
  const ref = useBusyButton(busy);
  return <button {...props} ref={ref} aria-busy={busy} disabled={disabled || busy}
    onClick={event => {
      if (busy) return;
      const result: unknown = onClick?.(event);
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        setPending(true);
        void Promise.resolve(result as PromiseLike<unknown>).finally(() => {
          if (mounted.current) setPending(false);
        });
      }
    }} />;
}
