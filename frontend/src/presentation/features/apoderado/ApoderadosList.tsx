import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import "./style/ApoderadosList.css";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { APODERADOS_ICONS } from "@/shared/constants/Icons";
import { FcHighPriority } from "react-icons/fc";
import { Button } from "@/shared/ui/button/Button";
import { EmptyState } from "@/shared/ui/emptystate/EmptyState";
import type { FC } from "react";


interface ApoderadosListProps {
  apoderados: Apoderado[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  handleDelete?: (id: number) => void;
  handleEdit?: (id: number) => void;

}

export const ApoderadosList: FC<ApoderadosListProps> = ({
  apoderados,
  loading,
  error,
  onRefresh,
  handleDelete,
  handleEdit
}) => {
 const rows = loading
  ? Array.from({ length: apoderados.length > 0 ? apoderados.length : 5 })
  : apoderados;

  // Estado de Error
  if (error) {
    return (
      <FeedbackState
        message={error}
        onRefresh={onRefresh}
        type="error"
        icon={<FcHighPriority />}
      />
    );
  }

  // 2. Prioridad: Estado Vacío (SOLO si NO está cargando)
  // Agregamos la condición !loading
  if (!loading && apoderados.length === 0) {
    return (
      <EmptyState
        title="No hay apoderados"
        message="No se encontraron apoderados registrados en el sistema."
        icon={<APODERADOS_ICONS.conference />}
      />
    );
  }
  return (
    <article className="apoderados-container ">
      <header className="apoderados-header">
        <h2 className="apoderados-header__title">Lista de Apoderados</h2>
      </header>

      <div>
        <table className="apoderados-table">
          <thead>
            <tr >
              <th className="apoderados-table__th">Nombre</th>
              <th className="apoderados-table__th">Correo</th>
              <th className="apoderados-table__th">Teléfono</th>
              <th className="apoderados-table__th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => {
              const apoderado = item as Apoderado;

              return (
                <tr
                  key={loading ? index : apoderado.id}
                  className="apoderados-table__row--data"
                >
                  {/* NOMBRE */}
                  <td className="apoderados-table__td" data-label="Nombre">
                    {loading ? (
                      <div className="skeleton-block skeleton-input" />
                    ) : (
                      apoderado.nombre
                    )}
                  </td>

                  {/* EMAIL */}
                  <td className="apoderados-table__td" data-label="Email">
                    {loading ? (
                      <div className="skeleton-block skeleton-input" />
                    ) : (
                      apoderado.email
                    )}
                  </td>

                  {/* TELÉFONO */}
                  <td className="apoderados-table__td" data-label="Teléfono">
                    {loading ? (
                      <div className="skeleton-block skeleton-input" />
                    ) : (
                      apoderado.telefono
                    )}
                  </td>

                  {/* BOTONES (SIEMPRE REALES) */}
                  <td className="apoderados-table__td" data-label="Acciones">

                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleDelete?.(apoderado?.id)}
                      icon={<APODERADOS_ICONS.delete style={{
                         fontSize: "1.2rem",
                         color: "var( --color-surface)"
                         }} />}
                      testId={`delete-btn-${apoderado?.id}`}
                    />

                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleEdit?.(apoderado?.id)}
                      icon={
                        <APODERADOS_ICONS.edit
                          style={{
                            fontSize: "1.2rem",
                            color: "var( --color-surface)",
                          }}
                        />
                      }
                      testId={`edit-btn-${apoderado?.id}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
