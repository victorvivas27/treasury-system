import { Button } from "../button/Button";
import "./ModalAlert.css";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  message: string;
  type: "success" | "error";
  onClose: () => void;
  autoCloseTime?: number;
  title?: string;
  buttonLabel?: string;
  variant?: "modal" | "toast";
}

const DEFAULT_AUTO_CLOSE_TIME = 4000;

export const ModalAlert = ({
  isOpen,
  message,
  type,
  onClose,
  autoCloseTime = DEFAULT_AUTO_CLOSE_TIME,
  title,
  buttonLabel = "Entendido",
  variant = "modal",
}: ModalProps) => {
  useEffect(() => {
    if (isOpen && autoCloseTime > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseTime, onClose]);

  if (!isOpen) return null;

  return (
    <aside
      className={`modal-overlay ${variant === "toast" ? "modal-overlay--toast" : ""}`}
      onClick={onClose}
      aria-modal={variant === "modal" ? "true" : undefined}
      role={variant === "modal" ? "dialog" : type === "error" ? "alert" : "status"}
    >
      <article
        className={`modal-container animate-modal ${variant === "toast" ? "modal-container--toast" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* BARRA DE TIEMPO: Solo se muestra si hay autoCloseTime */}
        {autoCloseTime > 0 && (
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
            {title ?? (type === "success" ? "¡Logrado!" : "Hubo un error")}
          </h3>
        </header>

        <main className="modal-body">
          <p>{message}</p>
        </main>

        <footer className="modal-footer">
          <Button
            label={buttonLabel}
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
