import { lockBodyScroll } from "@/shared/ui/dialog/scrollLock";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import "./UserEditorModal.css";

export function UserEditorModal({ title, description, busy, onClose, children }: {
  title: string; description: string; busy: boolean; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const anchor = trigger?.getBoundingClientRect();
    const unlockScroll = lockBodyScroll();
    if (typeof element.showModal === "function") element.showModal();
    else element.setAttribute("open", "");
    if (anchor && window.innerWidth > 768) {
      const bounds = { width: element.offsetWidth, height: element.offsetHeight };
      Object.assign(element.style, { margin: "0", right: "auto", bottom: "auto",
        left: `${Math.max(12, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 12))}px`,
        top: `${Math.max(12, Math.min(anchor.top, window.innerHeight - bounds.height - 12))}px` });
    }
    return () => {
      if (typeof element.close === "function") element.close();
      unlockScroll();
      trigger?.focus();
    };
  }, []);
  return <dialog ref={dialog} className="user-editor-modal" aria-labelledby={titleId}
    aria-describedby={descriptionId} aria-modal="true"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="user-editor-modal__heading">
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
    </header>
    {children}
  </dialog>;
}
