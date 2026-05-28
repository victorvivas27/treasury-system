import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import "./style/AlumnosList.css";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import { FcHighPriority } from "react-icons/fc";
import { Button } from "@/shared/ui/button/Button";
import { EmptyState } from "@/shared/ui/emptystate/EmptyState";
import type { FC } from "react";

interface AlumnosListProps {
  alumnos: Alumno[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  handleDelete?: (id: number) => void;
  handleEdit?: (id: number) => void;
  currentPage: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  hasPrevPage?: boolean;
  pageSize: number;
  isLastPage: boolean;
}

type EmptyRow = {
  id: string;
  empty: true;
};

type RowItem = Alumno | EmptyRow;

export const AlumnosList: FC<AlumnosListProps> = ({
  alumnos,
  loading,
  error,
  onRefresh,
  handleDelete,
  handleEdit,
  currentPage,
  onNextPage,
  onPrevPage,
  hasPrevPage,
  isLastPage,
  pageSize,
}) => {
  const emptyRows = Math.max(pageSize - alumnos.length, 0);

  const rows: RowItem[] = loading
    ? Array.from({ length: pageSize }).map((_, index) => ({
      id: `loading-${index}`,
      empty: true,
    }))
    : [
      ...alumnos,
      ...Array.from({ length: emptyRows }).map((_, index) => ({
        id: `empty-${index}`,
        empty: true as const,
      })),
    ];

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

  if (!loading && alumnos.length === 0) {
    return (
      <EmptyState
        title="No hay alumnos"
        message="No se encontraron alumnos registrados en el sistema."
        icon={<ALUMNOS_ICONS.conference />}
      />
    );
  }

  return (
    <article className="alumnos-container">
      <header className="alumnos-header">
        <h2 className="alumnos-header__title">Lista de Alumnos</h2>
      </header>

      <table className="alumnos-table">
        <thead>
          <tr>
            <th className="alumnos-table__th">Nombre</th>
            <th className="alumnos-table__th">Curso</th>
            <th className="alumnos-table__th">Apoderado ID</th>
            <th className="alumnos-table__th">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => {
            const isEmptyRow = "empty" in item;
            const alumno = item as Alumno;

            return (
              <tr
                key={item.id}
                className={`alumnos-table__row--data ${isEmptyRow && !loading ? "empty-row" : ""
                  }`}
              >
                <td className="alumnos-table__td" data-label="Nombre">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    alumno.nombre
                  )}
                </td>

                <td className="alumnos-table__td" data-label="Curso">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    alumno.curso
                  )}
                </td>

                <td className="alumnos-table__td" data-label="Apoderado ID">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    alumno.apoderadoId
                  )}
                </td>

                <td className="alumnos-table__td" data-label="Acciones">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : !isEmptyRow && alumno ? (
                    <div className="alumnos-table__td--actions">
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDelete?.(alumno.id)}
                        icon={
                          <ALUMNOS_ICONS.delete
                            style={{
                              fontSize: "1rem",
                              color: "var(--color-surface)",
                            }}
                          />
                        }
                        testId={`delete-btn-${alumno.id}`}
                      />

                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleEdit?.(alumno.id)}
                        icon={
                          <ALUMNOS_ICONS.edit
                            style={{
                              fontSize: "1rem",
                              color: "var(--color-surface)",
                            }}
                          />
                        }
                        testId={`edit-btn-${alumno.id}`}
                      />
                    </div>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pagination">
        <Button
          onClick={onPrevPage}
          disabled={!hasPrevPage || loading}
          variant="secondary"
          size="small"
          label="◀ Anterior"
        />

        <span className="no-highlight">Página {currentPage + 1}</span>

        <Button
          onClick={onNextPage}
          disabled={loading || isLastPage}
          variant="secondary"
          size="small"
          label="Siguiente ▶"
        />
      </div>
    </article>
  );
};
