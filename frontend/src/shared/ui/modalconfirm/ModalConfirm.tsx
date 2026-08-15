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
  compact?: boolean;
  raised?: boolean;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  confirmIcon?: ReactNode;
  cancelIcon?: ReactNode;
  anchor?: { top: number; left: number };
  containerClassName?: string;
}

export const ModalConfirm = ({
  isOpen,
  title = "Confirmar acción",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isLoading = false,
  confirmDisabled = false,
  compact = false,
  raised = false,
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  children,
  confirmIcon,
  cancelIcon,
  anchor,
  containerClassName = "",
}: ModalConfirmProps) => {
  if (!isOpen) return null;

  return (
    <aside
      className={`modal-confirm-overlay ${compact ? "modal-confirm-overlay--compact" : ""} ${
        anchor ? "modal-confirm-overlay--anchored" : ""}`}
      onClick={() => {
        if (!isLoading) onCancel();
      }}
      aria-modal="true"
      role="dialog"
    >
      <article
        className={`modal-confirm-container ${compact ? "modal-confirm-container--compact" : ""} ${raised ? "modal-confirm-container--raised" : ""} ${containerClassName}`}
        style={anchor ? { position: "fixed", top: anchor.top, left: anchor.left } : undefined}
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
            icon={cancelIcon}
            iconPosition="left"
          />

          <Button
            label={isLoading ? "Procesando..." : confirmLabel}
            onClick={onConfirm}
            size="medium"
            variant={confirmVariant}
            type="button"
            loading={isLoading}
            disabled={isLoading || confirmDisabled}
            icon={confirmIcon}
            iconPosition="left"
          />
        </footer>
      </article>
    </aside>
  );
};
