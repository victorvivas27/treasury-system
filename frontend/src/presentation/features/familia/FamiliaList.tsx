import { Button } from "@/shared/ui/button/Button";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import "./style/FamiliaList.css";
import { useMemo, useState, type FC } from "react";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { FcHighPriority } from "react-icons/fc";
import { EmptyState } from "@/shared/ui/emptystate/EmptyState";
import { FAMILIA_ICONS } from "@/shared/constants/Icons";
import type { FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import { CodeReveal } from "@/shared/ui/codereveal/CodeReveal";
import { ExpandableSearch } from "@/shared/ui/expandablesearch/ExpandableSearch";

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
  const [search, setSearch] = useState("");
  const filteredFamilias = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return term
      ? familias.filter((familia) => familia.alumno.nombre.toLocaleLowerCase("es").includes(term)
        || familia.apoderados.some((item) => item.nombre.toLocaleLowerCase("es").includes(term)))
      : familias;
  }, [familias, search]);
  const emptyRows = Math.max(pageSize - filteredFamilias.length, 0);

  const rows: RowItem[] = loading
    ? Array.from({ length: pageSize }).map((_, index) => ({
        familiaId: `loading-${index}`,
        empty: true,
      }))
    : [
        ...filteredFamilias,
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
        <ExpandableSearch value={search} onChange={setSearch} />
      </header>
      {search.trim() && filteredFamilias.length === 0 && (
        <p className="list-search-empty">No se encontraron familias con ese nombre.</p>
      )}

      <table className="familia-table">
        <thead>
          <tr>
            <th className="familia-table__th">Alumno</th>
            <th className="familia-table__th">Apoderados</th>
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
                <td className="familia-table__td familia-table__person" data-label="Alumno">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    <span className="familia-table__student">
                      <span>{familia.alumno.nombre}</span>
                      <CodeReveal
                        label="Ver códigos"
                        codes={[
                          { label: "Familia", value: familia.codigoFamilia },
                          { label: "Alumno", value: familia.alumno.codigo },
                        ]}
                      />
                    </span>
                  )}
                </td>

                <td className="familia-table__td" data-label="Apoderados">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : isEmptyRow ? (
                    <span>&nbsp;</span>
                  ) : (
                    `${familia.apoderados.length} apoderados`
                  )}
                </td>

                <td className="familia-table__td familia-table__person" data-label="Principal">
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

                <td className="familia-table__td familia-table__person" data-label="Secundarios">
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
                    <div className="familia-table__td--actions loading-action-placeholder">
                      <Button variant="danger" size="small"
                        className="familia-table__action-button" disabled
                        onClick={() => undefined}
                        icon={<FAMILIA_ICONS.delete />} label="Eliminar" />
                      <Button variant="secondary" size="small"
                        className="familia-table__action-button" disabled
                        onClick={() => undefined}
                        icon={<FAMILIA_ICONS.edit />} label="Editar" />
                    </div>
                  ) : !isEmptyRow && familia ? (
                    <div className="familia-table__td--actions">
                      <Button
                        variant="danger"
                        size="small"
                        className="familia-table__action-button"
                        onClick={() => handleDelete?.(familia.familiaId)}
                        icon={<FAMILIA_ICONS.delete />}
                        label="Eliminar"
                        testId={`delete-btn-${familia.familiaId}`}
                      />

                      <Button
                        variant="secondary"
                        size="small"
                        className="familia-table__action-button"
                        onClick={() => handleEdit?.(familia.familiaId)}
                        icon={<FAMILIA_ICONS.edit />}
                        label="Editar"
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

      <Pagination currentPage={currentPage + 1} hasPrevious={hasPrevPage}
        hasNext={!isLastPage} loading={loading} onPrevious={onPrevPage}
        onNext={onNextPage} ariaLabel="Paginación de familias" />
    </article>
  );
};
