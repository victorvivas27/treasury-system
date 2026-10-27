import { lockBodyScroll } from "./scrollLock";
import { useLayoutEffect, useRef, type RefObject } from 'react';

const dialogs: HTMLElement[] = [];
/** Focus only the top dialog; preserve its trigger and the document scroll state. */
export function useDialogFocus(open: boolean, onClose: () => void, blocked = false) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const blockedRef = useRef(blocked);
  closeRef.current = onClose;
  blockedRef.current = blocked;
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const unlockScroll = lockBodyScroll();
    dialogs.push(dialog);
    const active = () => dialogs.at(-1) === dialog;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
    )).filter(element => element.tabIndex >= 0 && !element.closest('[hidden], [inert], [aria-hidden="true"]'));
    const focusFirst = () => (focusable()[0] ?? dialog).focus();
    focusFirst();
    const keydown = (event: KeyboardEvent) => {
      if (!active()) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!blockedRef.current) closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0]; const last = elements.at(-1);
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first.focus();
      }
    };
    const focusin = (event: FocusEvent) => {
      if (active() && event.target instanceof Node && !dialog.contains(event.target)) focusFirst();
    };
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusin);
    return () => {
      const index = dialogs.indexOf(dialog);
      if (index >= 0) dialogs.splice(index, 1);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusin);
      unlockScroll();
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}

/** Preserve the contextual anchor while keeping the dialog inside the viewport. */
export function useDialogAnchor(ref: RefObject<HTMLElement | null>, open: boolean,
  anchor?: { top: number; left: number }) {
  useLayoutEffect(() => {
    const panel = ref.current?.querySelector<HTMLElement>('article');
    if (!open || !anchor || !panel) return;
    const position = () => {
      panel.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - panel.offsetWidth - 12))}px`;
      panel.style.top = `${Math.max(12, Math.min(anchor.top, window.innerHeight - panel.offsetHeight - 12))}px`;
    };
    position();
    window.addEventListener('resize', position);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(position);
    observer?.observe(panel);
    return () => { window.removeEventListener('resize', position); observer?.disconnect(); };
  }, [ref, open, anchor?.top, anchor?.left]);
}
