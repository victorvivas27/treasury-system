import { useEffect, useRef, useState } from "react";
import { IoHeartOutline } from "react-icons/io5";
import { FiEdit2 } from "react-icons/fi";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import "./BoardMessage.css";
import type { BoardMessageContent } from "@/core/A-domain/entities/treasury/BoardMessageContent";

const defaultMessage: BoardMessageContent = {
  heading: "De parte de la directiva",
  title: "Gracias por hacer equipo.",
  message: "Su tiempo, ideas y cariño hacen posibles momentos inolvidables para nuestros niños y niñas.",
  signature: "Con cariño,\nLa directiva del curso",
};
const fields = [
  { key: "heading", label: "Encabezado", max: 120 },
  { key: "title", label: "Título", max: 160 },
  { key: "message", label: "Frase", max: 500 },
  { key: "signature", label: "Firma", max: 240 },
] as const;
const repository = new TreasuryRepositoryImpl();

export const BoardMessage = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const note = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [message, setMessage] = useState(defaultMessage);
  const [draft, setDraft] = useState(defaultMessage);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    repository.getBoardMessage().then(value => {
      if (active) { setMessage(value); setLoaded(true); }
    }).catch(() => {
      if (active) setError("No se pudo cargar el mensaje guardado. Recargá la página para intentar nuevamente.");
    });
    return () => { active = false; };
  }, []);

  const save = async () => {
    if (!isAdmin || saving || fields.some(field => !draft[field.key].trim() || draft[field.key].length > field.max)) return;
    setSaving(true);
    setError("");
    try {
      setMessage(await repository.saveBoardMessage({
        heading: draft.heading.trim(), title: draft.title.trim(),
        message: draft.message.trim(), signature: draft.signature.trim(),
      }));
      dialog.current?.close();
    } catch {
      setError("No se pudo guardar el mensaje. Intentá nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!window.IntersectionObserver) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) setVisible(true);
      }
    }, { threshold: [0, 0.25] });

    if (note.current) observer.observe(note.current);
    return () => observer.disconnect();
  }, []);

  return <><section ref={note}
    className={`dashboard-board-message dashboard-board-message--whole${visible ? " is-visible" : ""}`}
    aria-labelledby="dashboard-board-message-title">
    <div className="dashboard-board-message__content">
      <span className="dashboard-board-message__eyebrow"><IoHeartOutline aria-hidden="true" />
        {message.heading}</span>
      <h2 id="dashboard-board-message-title">{message.title}</h2>
      <p>{message.message}</p>
      <footer><span className="dashboard-board-message__signature">
        {message.signature.includes("\n") ? <>{message.signature.split("\n")[0]}
          <strong>{message.signature.split("\n").slice(1).join("\n")}</strong></>
          : <strong>{message.signature}</strong>}</span>
        {isAdmin && <button type="button" className="board-message-edit" disabled={!loaded}
          data-dashboard-capture-exclude
          onClick={() => {
            setDraft(message); setError(""); drag.current = null;
            if (dialog.current) {
              dialog.current.style.removeProperty("inset");
              dialog.current.style.removeProperty("margin");
              dialog.current.style.removeProperty("left");
              dialog.current.style.removeProperty("top");
              dialog.current.showModal();
            }
          }}>
          <FiEdit2 aria-hidden="true" /> Editar mensaje</button>}
      </footer>
      {isAdmin && !loaded && error && <p role="alert">{error}</p>}
    </div>
  </section>
    {isAdmin && <dialog ref={dialog} className="board-message-modal" data-dashboard-capture-exclude
      aria-labelledby="board-message-modal-title" onCancel={event => { if (saving) event.preventDefault(); }}>
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <h2 id="board-message-modal-title" className="board-message-drag-handle"
          title="Arrastrá para mover el modal"
          onPointerDown={event => {
            if (event.button !== 0 || !dialog.current) return;
            const bounds = dialog.current.getBoundingClientRect();
            drag.current = { pointerId: event.pointerId,
              offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top };
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
          }}
          onPointerMove={event => {
            const currentDrag = drag.current;
            const modal = dialog.current;
            if (!currentDrag || currentDrag.pointerId !== event.pointerId || !modal) return;
            const bounds = modal.getBoundingClientRect();
            const left = Math.max(0, Math.min(event.clientX - currentDrag.offsetX,
              window.innerWidth - bounds.width));
            const top = Math.max(0, Math.min(event.clientY - currentDrag.offsetY,
              window.innerHeight - bounds.height));
            Object.assign(modal.style, { inset: "auto", margin: "0", left: `${left}px`, top: `${top}px` });
          }}
          onPointerUp={event => {
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => { drag.current = null; }}
          onLostPointerCapture={() => { drag.current = null; }}>
          Editar mensaje del dashboard
        </h2>
        {fields.map(field => <div className="board-message-field" key={field.key}>
          <label htmlFor={`board-message-${field.key}`}>{field.label}</label>
          {field.key === "heading" || field.key === "title"
            ? <input id={`board-message-${field.key}`} value={draft[field.key]} maxLength={field.max}
              required autoFocus={field.key === "heading"} disabled={saving}
              onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />
            : <textarea id={`board-message-${field.key}`} value={draft[field.key]} maxLength={field.max}
              rows={field.key === "message" ? 4 : 2} required disabled={saving}
              onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />}
          {field.key === "signature" && <span className="board-message-field-help">Escribí el saludo en la primera línea y quién firma en la segunda.</span>}
          <small>{draft[field.key].length}/{field.max} caracteres</small>
        </div>)}
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" disabled={saving} onClick={() => dialog.current?.close()}>Cancelar</button>
          <button type="submit" disabled={saving || fields.some(field => !draft[field.key].trim())}>{saving ? "Guardando..." : "Guardar cambios"}</button>
        </footer>
      </form>
    </dialog>}
  </>;
};
