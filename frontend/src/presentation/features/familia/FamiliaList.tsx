import { Button } from "@/shared/ui/button/Button";
import "./style/FamiliaList.css";
import type { FC } from "react";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { FcHighPriority } from "react-icons/fc";
import { EmptyState } from "@/shared/ui/emptystate/EmptyState";
import { FAMILIA_ICONS } from "@/shared/constants/Icons";
import type { FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";

interface FamiliaListProps {
  familias: FamiliaDetalle[];
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

type RowItem = FamiliaDetalle | EmptyRow;

export const FamiliaList: FC<FamiliaListProps> = ({
  familias,
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
  /**
   * Cálculo de filas vacías para mantener la altura de la tabla
   * consistente durante la carga y cuando hay pocos datos
   */
  const emptyRows = Math.max(pageSize - familias.length, 0);

  const rows: RowItem[] = loading
    ? Array.from({ length: pageSize }).map((_, index) => ({
        id: `loading-${index}`,
        empty: true,
      }))
    : [
        ...familias,
        ...Array.from({ length: emptyRows }).map((_, index) => ({
          id: `empty-${index}`,
          empty: true as const,
        })),
      ];

  /**
   * Manejo de estados de error y vacío
   */
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

  /**
   * Manejo de estados de vacío
   */
  if (!loading && familias.length === 0) {
    return (
      <EmptyState
        title="No hay familias"
        message="No se encontraron familias registradas en el sistema."
        icon={<FAMILIA_ICONS.conference />}
      />
    );
  }

  return (
    <article className="familia-list">
      <header className="familia-header">
        <h2 className="familia-header__title">Lista de Familias</h2>
      </header>

      <table className="familia-table">
        <thead>
          <tr>
            <th className="familia-table__th">Alumno</th>
            <th className="familia-table__th">Curso</th>
            <th className="familia-table__th">Apoderado</th>
            <th className="familia-table__th">Código Apoderado</th>
            <th className="familia-table__th">Parentesco</th>
            <th className="familia-table__th">Principal</th>
            <th className="familia-table__th">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => {
            const isEmptyRow = "empty" in item;
            const familia = item as FamiliaDetalle;

            return (
              <tr
                key={item.id}
                className={`familia-table__row--data ${
                  isEmptyRow && !loading ? "empty-row" : ""
                }`}
              >
                <td className="familia-table__td" data-label="Alumno">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    <strong>{familia.alumnoNombre}</strong>
                  )}
                </td>

                <td className="familia-table__td" data-label="Curso">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    familia.alumnoCurso
                  )}
                </td>

                <td className="familia-table__td" data-label="Apoderado">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    familia.apoderadoNombre
                  )}
                </td>

                <td className="familia-table__td" data-label="Código Apoderado">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    familia.apoderadoCodigo
                  )}
                </td>

                <td className="familia-table__td" data-label="Parentesco">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    familia.parentesco
                  )}
                </td>

                <td className="familia-table__td" data-label="Principal">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    <span className={familia.principal ? "badge-success" : "badge-secondary"}>
                      {familia.principal ? "Sí" : "No"}
                    </span>
                  )}
                </td>

                <td className="familia-table__td" data-label="Acciones">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : !isEmptyRow && familia ? (
                    <div className="familia-table__td--actions">
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDelete?.(familia.id)}
                        icon={
                          <FAMILIA_ICONS.delete
                            style={{
                              fontSize: "1rem",
                              color: "var(--color-surface)",
                            }}
                          />
                        }
                        testId={`delete-btn-${familia.id}`}
                      />

                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleEdit?.(familia.id)}
                        icon={
                          <FAMILIA_ICONS.edit
                            style={{
                              fontSize: "1rem",
                              color: "var(--color-surface)",
                            }}
                          />
                        }
                        testId={`edit-btn-${familia.id}`}
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
