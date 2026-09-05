import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiEdit2 } from "react-icons/fi";
import { Button } from "@/shared/ui/button/Button";
import "./MessageEditModal.css";

export const MessageEditModal = ({ message, anchor, onSave, onClose }: {
  message: string;
  anchor: HTMLElement | null;
  onSave: (text: string) => Promise<void>;
  onClose: () => void;
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savingRef = useRef(false);
  const [text, setText] = useState(message);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const position = () => {
      const rect = anchor?.getBoundingClientRect();
      const margin = 12;
      const width = dialog.getBoundingClientRect().width;
      const height = dialog.getBoundingClientRect().height;
      const left = rect ? rect.right - width : (window.innerWidth - width) / 2;
      const top = rect ? (rect.bottom + height + margin <= window.innerHeight
        ? rect.bottom + 8 : rect.top - height - 8) : (window.innerHeight - height) / 2;
      dialog.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - width - margin))}px`;
      dialog.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - height - margin))}px`;
    };
    position();
    textareaRef.current?.focus();
    const resize = new ResizeObserver(position);
    resize.observe(dialog);
    window.addEventListener("resize", position);
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", position);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [anchor]);

  const save = async () => {
    if (!text.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true); setError("");
    try { await onSave(text.trim()); }
    catch { setError("No se pudo guardar. Reintenta; el plazo de edición es de 15 minutos."); }
    finally { savingRef.current = false; setSaving(false); }
  };

  return createPortal(<dialog ref={dialogRef} className="message-edit-modal" aria-labelledby={titleId}
    aria-modal="true" onCancel={event => { event.preventDefault(); if (!savingRef.current) onClose(); }}>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <header><FiEdit2 aria-hidden="true" /><h2 id={titleId}>Editar mensaje</h2></header>
      <label className="message-edit-modal__field">
        <span>Mensaje</span>
        <textarea ref={textareaRef} value={text} maxLength={2000} rows={4} disabled={saving}
          onChange={event => setText(event.target.value)} />
      </label>
      <span className="message-edit-modal__count">{text.length}/2000</span>
      {error && <p className="message-edit-modal__error" role="alert">{error}</p>}
      <footer>
        <Button label="Cancelar" variant="secondary" size="small" onClick={onClose} disabled={saving} />
        <Button label={saving ? "Guardando…" : "Guardar"} type="submit" size="small"
          onClick={() => undefined} disabled={!text.trim() || saving} loading={saving} />
      </footer>
    </form>
  </dialog>, document.body);
};
