import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import "./style/AlumnosList.css";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import { FcHighPriority } from "react-icons/fc";
import { Button } from "@/shared/ui/button/Button";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import { EmptyState } from "@/shared/ui/emptystate/EmptyState";
import { useState, type FC } from "react";
import { FiMessageSquare } from "react-icons/fi";
import { CodeReveal } from "@/shared/ui/codereveal/CodeReveal";
import { ExpandableSearch } from "@/shared/ui/expandablesearch/ExpandableSearch";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";

interface AlumnosListProps {
  alumnos: Alumno[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  handleDelete?: (codigo: string) => void;
  handleEdit?: (codigo: string) => void;
  currentPage: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  hasPrevPage?: boolean;
  pageSize: number;
  isLastPage: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
}

type EmptyRow = {
  rowKey: string;  // Cambiado de 'id' a 'rowKey' para evitar conflicto
  empty: true;
};

type RowItem = Alumno | EmptyRow;
type AlumnoWithLegacyId = Alumno & { id?: number };

// Type guard para saber si es EmptyRow
const isEmptyRow = (item: RowItem): item is EmptyRow => {
  return "empty" in item && item.empty === true;
};

// Función para obtener la key única de cada fila
const getRowKey = (item: RowItem): string => {
  if (isEmptyRow(item)) {
    return item.rowKey;
  }
  const alumno = item as AlumnoWithLegacyId;
  return `alumno-${alumno.codigo ?? alumno.alumnoId ?? alumno.id}`;
};

const getAlumnoIdentifier = (alumno: AlumnoWithLegacyId): string | number => (
  alumno.codigo ?? alumno.alumnoId ?? alumno.id ?? ""
);

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
  search = "",
  onSearchChange,
}) => {
  const [selectedObservation, setSelectedObservation] = useState("");
  const emptyRows = Math.max(pageSize - alumnos.length, 0);

  const rows: RowItem[] = loading
    ? Array.from({ length: pageSize }).map((_, index) => ({
      rowKey: `loading-${index}`,
      empty: true,
    }))
    : [
      ...alumnos,
      ...Array.from({ length: emptyRows }).map((_, index) => ({
        rowKey: `empty-${index}`,
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

  if (!loading && alumnos.length === 0 && !search.trim()) {
    return (
      <EmptyState
        title="No hay alumnos"
        message="No se encontraron alumnos registrados en el sistema."
        icon={<ALUMNOS_ICONS.conference />}
      />
    );
  }

  return (
    <article className="alumnos-container responsive-data-list">
      <header className="alumnos-header">
        <h2 className="alumnos-header__title">Lista de Alumnos</h2>
        <ExpandableSearch value={search} onChange={(value) => onSearchChange?.(value)} />
      </header>
      {search.trim() && alumnos.length === 0 && (
        <p className="list-search-empty">No se encontraron alumnos con ese nombre.</p>
      )}

      <table className="alumnos-table">
        <thead>
          <tr>
            <th className="alumnos-table__th">Nombre</th>
            <th className="alumnos-table__th">Curso</th>
            <th className="alumnos-table__th">Mensaje</th>
            <th className="alumnos-table__th">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => {
            const empty = isEmptyRow(item);
            const alumno = item as AlumnoWithLegacyId;
            const alumnoIdentifier = getAlumnoIdentifier(alumno);

            return (
              <tr
                key={getRowKey(item)}
                className={`alumnos-table__row--data ${empty && !loading ? "empty-row" : ""}`}
              >
                <td className="alumnos-table__td alumnos-table__text" data-label="Nombre">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : empty ? (
                    <span>&nbsp;</span>
                  ) : (
                    <span className="alumnos-table__person">
                      <span>{alumno.nombre}</span>
                      <CodeReveal codes={[{ value: alumnoIdentifier }]} />
                    </span>
                  )}
                </td>

                <td className="alumnos-table__td" data-label="Curso">
                  {loading ? (
                    <div className="skeleton-block skeleton-input" />
                  ) : empty ? (
                    <span>&nbsp;</span>
                  ) : (
                    alumno.curso
                  )}
                </td>

                <td className="alumnos-table__td" data-label="Mensaje">
                  {!loading && !empty && alumno.observacion ? (
                    <button
                      type="button"
                      className="alumnos-table__observation-button"
                      aria-label={`Ver observación de ${alumno.nombre}`}
                      title="Ver observación"
                      onClick={() => setSelectedObservation(alumno.observacion ?? "")}
                    >
                      <FiMessageSquare aria-hidden="true" />
                    </button>
                  ) : (
                    !loading && !empty ? (
                      <span className="alumnos-table__no-observation">Sin mensaje</span>
                    ) : (
                      <span>&nbsp;</span>
                    )
                  )}
                </td>

                <td className="alumnos-table__td" data-label="Acciones">
                  {loading ? (
                    <div className="alumnos-table__td--actions loading-action-placeholder">
                      <Button variant="danger" size="small"
                        className="alumnos-table__icon-button" disabled
                        onClick={() => undefined}
                        icon={<ALUMNOS_ICONS.delete />} label="Eliminar" />
                      <Button variant="secondary" size="small"
                        className="alumnos-table__icon-button" disabled
                        onClick={() => undefined}
                        icon={<ALUMNOS_ICONS.edit />} label="Editar" />
                    </div>
                  ) : !empty && alumno ? (
                    <div className="alumnos-table__td--actions">
                      <Button
                        variant="danger"
                        size="small"
                        className="alumnos-table__icon-button"
                        onClick={() => handleDelete?.(alumnoIdentifier as string)}
                        icon={<ALUMNOS_ICONS.delete />}
                        label="Eliminar"
                        testId={`delete-btn-${alumnoIdentifier}`}
                      />

                      <Button
                        variant="secondary"
                        size="small"
                        className="alumnos-table__icon-button"
                        onClick={() => handleEdit?.(alumnoIdentifier as string)}
                        icon={<ALUMNOS_ICONS.edit />}
                        label="Editar"
                        testId={`edit-btn-${alumnoIdentifier}`}
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
        onNext={onNextPage} ariaLabel="Paginación de alumnos" />
      <ModalAlert
        isOpen={Boolean(selectedObservation)}
        message={selectedObservation}
        type="success"
        title="Observación del alumno"
        buttonLabel="Cerrar"
        autoCloseTime={0}
        onClose={() => setSelectedObservation("")}
      />
    </article>
  );
};
