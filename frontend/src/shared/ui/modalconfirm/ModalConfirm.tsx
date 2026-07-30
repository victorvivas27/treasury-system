import { Button } from "../button/Button";
import "./ModalConfirm.css";
import type { ReactNode } from "react";

interface ModalConfirmProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export const ModalConfirm = ({
  isOpen,
  title = "Confirmar acción",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isLoading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ModalConfirmProps) => {
  if (!isOpen) return null;

  return (
    <aside
      className="modal-confirm-overlay"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
      aria-modal="true"
      role="dialog"
    >
      <article
        className="modal-confirm-container"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-confirm-header">
          <span className="modal-confirm-icon" aria-hidden="true">
            ⚠
          </span>

          <h3 className="modal-confirm-title">{title}</h3>
        </header>

        <main className="modal-confirm-body">
          <p>{message}</p>
          {children && <div className="modal-confirm-content">{children}</div>}
        </main>

        <footer className="modal-confirm-footer">
          <Button
            label={cancelLabel}
            onClick={onCancel}
            size="medium"
            variant="secondary"
            type="button"
            disabled={isLoading || confirmDisabled}
          />

          <Button
            label={isLoading ? "Procesando..." : confirmLabel}
            onClick={onConfirm}
            size="medium"
            variant="primary"
            type="button"
            loading={isLoading}
          />
        </footer>
      </article>
    </aside>
  );
};
