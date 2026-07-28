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
  familiaId: string;
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
  const emptyRows = Math.max(pageSize - familias.length, 0);

  const rows: RowItem[] = loading
    ? Array.from({ length: pageSize }).map((_, index) => ({
        familiaId: `loading-${index}`,
        empty: true,
      }))
    : [
        ...familias,
        ...Array.from({ length: emptyRows }).map((_, index) => ({
          familiaId: `empty-${index}`,
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
    <article className="familia-list responsive-data-list">
      <header className="familia-header">
        <h2 className="familia-header__title">Lista de Familias</h2>
      </header>

      <table className="familia-table">
        <thead>
          <tr>
            <th className="familia-table__th">Codigo Familia</th>
            <th className="familia-table__th">Alumno Codigo</th>
            <th className="familia-table__th">Alumno</th>
            <th className="familia-table__th">Cantidad Apoderados</th>
            <th className="familia-table__th">Principal</th>
            <th className="familia-table__th">Secundarios</th>
            <th className="familia-table__th">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => {
            const isEmptyRow = "empty" in item;
            const familia = item as FamiliaDetalle;
            const principal = !isEmptyRow
              ? familia.apoderados.find((apoderado) => apoderado.relacion.esPrincipal)
              : undefined;
            const secundarios = !isEmptyRow
              ? familia.apoderados.filter(
                  (apoderado) => !apoderado.relacion.esPrincipal,
                )
              : [];

            return (
              <tr
                key={item.familiaId}
                className={`familia-table__row--data ${
                  isEmptyRow && !loading ? "empty-row" : ""
                }`}
              >
                <td className="familia-table__td" data-label="Codigo Familia">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    <strong>{familia.codigoFamilia}</strong>
                  )}
                </td>

                <td className="familia-table__td" data-label="Alumno Codigo">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    familia.alumno.codigo
                  )}
                </td>

                <td className="familia-table__td" data-label="Alumno">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    familia.alumno.nombre
                  )}
                </td>

                <td className="familia-table__td" data-label="Cantidad Apoderados">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    `${familia.apoderados.length} apoderados`
                  )}
                </td>

                <td className="familia-table__td" data-label="Principal">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    <span className={principal ? "badge-success" : "badge-secondary"}>
                      {principal?.nombre ?? "-"}
                    </span>
                  )}
                </td>

                <td className="familia-table__td" data-label="Secundarios">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    <span className="badge-secondary">
                      {secundarios.length > 0
                        ? secundarios.map((apoderado) => apoderado.nombre).join(", ")
                        : "-"}
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
                        onClick={() => handleDelete?.(familia.familiaId)}
                        icon={<FAMILIA_ICONS.delete />}
                        testId={`delete-btn-${familia.familiaId}`}
                      />

                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleEdit?.(familia.familiaId)}
                        icon={<FAMILIA_ICONS.edit />}
                        testId={`edit-btn-${familia.familiaId}`}
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
          label="Anterior"
        />

        <span className="no-highlight">Pagina {currentPage + 1}</span>

        <Button
          onClick={onNextPage}
          disabled={loading || isLastPage}
          variant="secondary"
          size="small"
          label="Siguiente"
        />
      </div>
    </article>
  );
};
