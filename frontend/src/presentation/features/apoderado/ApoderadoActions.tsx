import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import { APODERADOS_ICONS } from "@/shared/constants/Icons";
import { Button } from "@/shared/ui/button/Button";

interface ApoderadoActionsProps {
  apoderado?: Apoderado;
  identifier?: string | number;
  loading?: boolean;
  onEdit?: (codigo: string) => void;
  onDelete?: (codigo: string | number) => void;
  onEnableAccess?: (apoderado: Apoderado) => void;
}

export function ApoderadoActions({ apoderado, identifier = "", loading = false,
  onEdit, onDelete, onEnableAccess }: ApoderadoActionsProps) {
  const canInvite = loading || (apoderado && apoderado.accessStatus !== "ACTIVO"
    && apoderado.accessStatus !== "BLOQUEADO");
  return <div className={`apoderados-table__td--actions admin-table-actions${loading ? " loading-action-placeholder" : ""}`}>
    <span className="apoderados-table__access-slot">
      {canInvite && <Button variant="primary" size="small" disabled={loading}
        className="apoderados-table__action-button apoderados-table__access-button"
        onClick={() => { if (apoderado) onEnableAccess?.(apoderado); }}
        icon={<APODERADOS_ICONS.add />} label="Acceso"
        ariaLabel={apoderado?.accessStatus === "INVITACION_PENDIENTE" ? "Reenviar invitación" : "Habilitar acceso"} />}
    </span>
    <Button variant="secondary" size="small" disabled={loading}
      className="apoderados-table__action-button apoderados-table__icon-button"
      onClick={() => { if (apoderado) onEdit?.(apoderado.codigo || String(identifier)); }}
      icon={<APODERADOS_ICONS.edit />} label="Editar" testId={loading ? undefined : `edit-btn-${identifier}`} />
    <Button variant="danger" size="small" disabled={loading}
      className="apoderados-table__action-button apoderados-table__icon-button"
      onClick={() => { if (apoderado) onDelete?.(apoderado.codigo || identifier); }}
      icon={<APODERADOS_ICONS.delete />} label="Eliminar" testId={loading ? undefined : `delete-btn-${identifier}`} />
  </div>;
}
