import { Button } from "../button/Button";
import "./ModalAlert.css";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  message: string;
  type: "success" | "error";
  onClose: () => void;
  autoCloseTime?: number;
}

export const ModalAlert = ({ isOpen, message, type, onClose, autoCloseTime }: ModalProps) => {
  useEffect(() => {
    if (isOpen && autoCloseTime) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseTime, onClose]);

  if (!isOpen) return null;

  return (
    <aside className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <article
        className="modal-container animate-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BARRA DE TIEMPO: Solo se muestra si hay autoCloseTime */}
        {autoCloseTime && (
          <div
            className={`modal-progress progress-${type}`}
            style={{ '--duration': `${autoCloseTime}ms` } as React.CSSProperties}
          />
        )}

        <header className={`modal-header modal-header-${type}`}>
          <span className="modal-icon" aria-hidden="true">
            {type === "success" ? "✔" : "✖"}
          </span>
          <h3 className="modal-title">
            {type === "success" ? "¡Logrado!" : "Hubo un error"}
          </h3>
        </header>

        <main className="modal-body">
          <p>{message}</p>
        </main>

        <footer className="modal-footer">
          <Button
            label="Entendido"
            onClick={onClose}
            size="medium"
            variant={type === "success" ? "primary" : "secondary"}
            type="button"
          />
        </footer>
      </article>
    </aside>
  );
};
