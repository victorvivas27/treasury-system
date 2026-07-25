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
  handleDelete?: (codigo: string | number) => void;
  handleEdit?: (codigo: string) => void;
  currentPage: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  hasPrevPage?: boolean;
  pageSize: number;
  isLastPage: boolean;
}

type EmptyRow = {
  apoderadoId: string;
  empty: true;
};

type RowItem = Apoderado | EmptyRow;
type ApoderadoWithLegacyId = Apoderado & { id?: number };

const getApoderadoIdentifier = (apoderado: ApoderadoWithLegacyId): number | string => (
  apoderado.apoderadoId ?? apoderado.id ?? ""
);

export const ApoderadosList: FC<ApoderadosListProps> = ({
  apoderados,
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
  const emptyRows = Math.max(pageSize - apoderados.length, 0);

  const rows: RowItem[] = loading
    ? Array.from({ length: pageSize }).map((_, index) => ({
      apoderadoId: `loading-${index}`,
      empty: true,
    }))
    : [
      ...apoderados,
      ...Array.from({ length: emptyRows }).map((_, index) => ({
        apoderadoId: `empty-${index}`,
        empty: true as const,
      })),
    ];

  /*================================*/


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
  /*================================*/


  /**
   * Manejo de estados de vacío
   */
  if (!loading && apoderados.length === 0) {
    return (
      <EmptyState
        title="No hay apoderados"
        message="No se encontraron apoderados registrados en el sistema."
        icon={<APODERADOS_ICONS.conference />}
      />
    );
  }
  /*================================*/

  return (
    <article className="apoderados-container">
      <header className="apoderados-header">
        <h2 className="apoderados-header__title">Lista de Apoderados</h2>
      </header>


      <table className="apoderados-table">
        <thead>
          <tr>
            <th className="apoderados-table__th">Código</th>
            <th className="apoderados-table__th">Nombre</th>
            <th className="apoderados-table__th">Correo</th>
            <th className="apoderados-table__th">Teléfono</th>
            <th className="apoderados-table__th">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => {
            const isEmptyRow = "empty" in item;
            const apoderado = item as ApoderadoWithLegacyId;
            const apoderadoIdentifier = getApoderadoIdentifier(apoderado);

            return (
              <tr
                key={"empty" in item ? item.apoderadoId : apoderadoIdentifier}
                className={`apoderados-table__row--data ${isEmptyRow && !loading ? "empty-row" : ""
                  }`}
              >
                <td className="apoderados-table__td" data-label="Código">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    apoderado.codigo || apoderadoIdentifier
                  )}
                </td>

                <td className="apoderados-table__td" data-label="Nombre">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    apoderado.nombre
                  )}
                </td>

                <td className="apoderados-table__td" data-label="Email">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    apoderado.email
                  )}
                </td>

                <td className="apoderados-table__td" data-label="Teléfono">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    apoderado.telefono
                  )}
                </td>

                <td className="apoderados-table__td" data-label="Acciones">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : !isEmptyRow && apoderado ? (
                    <div className="apoderados-table__td--actions">
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDelete?.(apoderado.codigo || apoderadoIdentifier)}
                        icon={
                          <APODERADOS_ICONS.delete />}
                        testId={`delete-btn-${apoderadoIdentifier}`}
                      />

                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleEdit?.(apoderado.codigo || String(apoderadoIdentifier))}
                        icon={<APODERADOS_ICONS.edit />}
                        testId={`edit-btn-${apoderadoIdentifier}`}
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
