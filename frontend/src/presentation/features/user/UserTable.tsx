import type { User } from "@/core/A-domain/entities/user/User";
import { ICONS } from "@/shared/constants/Icons";
import { Button } from "@/shared/ui/button/Button";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import "./UserTable.css";
import "@/shared/style/AdminDataTable.css";
import { CodeReveal } from "@/shared/ui/codereveal/CodeReveal";
import { ExpandableSearch } from "@/shared/ui/expandablesearch/ExpandableSearch";
import { StatusToggleButton } from "@/shared/ui/status-toggle/StatusToggleButton";
import { SingleLineFitText } from "@/shared/ui/single-line-fit-text/SingleLineFitText";

interface UserTableProps {
  users: User[];
  loading?: boolean;
  isAdmin: boolean;
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (user: User) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export const UserTable = ({ users, loading = false, isAdmin, onEdit, onDelete, onToggleStatus,
  currentPage, totalPages, pageSize, onPrevious, onNext,
  search = "", onSearchChange }: UserTableProps) => {

  return <article className="usuarios-container responsive-data-list">
    <header className="usuarios-header">
      <h2 className="usuarios-header__title">Lista de Usuarios</h2>
      <ExpandableSearch value={search} onChange={(value) => onSearchChange?.(value)} />
    </header>
    {search.trim() && users.length === 0 && (
      <p className="list-search-empty">No se encontraron usuarios con ese nombre.</p>
    )}

    <div className="usuarios-table-wrapper">
      <table className="usuarios-table admin-data-table admin-data-table--users">
        <colgroup>
          <col className="admin-col-status" />
          <col className="admin-col-primary" />
          <col className="admin-col-email" />
          <col className="admin-col-compact" />
          {isAdmin && <col className="admin-col-actions" />}
        </colgroup>
        <thead>
          <tr>
            <th className="usuarios-table__th">Estado</th>
            <th className="usuarios-table__th">Nombre</th>
            <th className="usuarios-table__th">Correo</th>
            <th className="usuarios-table__th">Rol</th>
            {isAdmin && <th className="usuarios-table__th">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: pageSize }, (_, row) => (
            <tr key={`loading-${row}`} className="usuarios-table__row--data"
              aria-hidden="true">
              {Array.from({ length: 4 }, (_, column) => (
                <td className="usuarios-table__td" key={column}>
                  <div className="skeleton-block usuarios-table__skeleton" />
                </td>
              ))}
              {isAdmin && <td className="usuarios-table__td">
                <div className="usuarios-table__td--actions loading-action-placeholder">
                  <Button variant="danger" size="small"
                    className="usuarios-table__icon-button" disabled
                    onClick={() => undefined}
                    icon={<ICONS.delete />} label="Eliminar" />
                  <Button variant="secondary" size="small"
                    className="usuarios-table__icon-button" disabled
                    onClick={() => undefined}
                    icon={<ICONS.edit />} label="Editar" />
                </div>
              </td>}
            </tr>
          )) : <>
          {users.map((user) => {
            const isActive = user.enabled && user.accountNonLocked;
            return (
              <tr key={user.id} className="usuarios-table__row--data">
                <td className="usuarios-table__td" data-label="Estado">
                  <span className="status-toggle-cell usuarios-status-toggle">
                    <span className={`usuarios-status ${isActive ? "is-active" : "is-inactive"}`}>
                      {isActive ? "Activo" : "Inactivo"}
                    </span>
                    {isAdmin && <StatusToggleButton active={user.enabled}
                      entityLabel={`usuario ${user.nombre}`}
                      onToggle={() => onToggleStatus(user)} />}
                  </span>
                </td>
                <td className="usuarios-table__td usuarios-table__text" data-label="Nombre">
                  <span className="usuarios-table__person">
                    <SingleLineFitText>{user.nombre}</SingleLineFitText>
                    <CodeReveal codes={[{ value: user.code }]} />
                  </span>
                </td>
                <td className="usuarios-table__td usuarios-table__email" data-label="Correo">
                  <SingleLineFitText>{user.correo}</SingleLineFitText>
                </td>
                <td className="usuarios-table__td" data-label="Rol">
                  <span className={`usuarios-role ${user.rol === "ADMIN" ? "is-admin" : "is-user"}`}>
                    {user.rol === "ADMIN" ? "ADMIN" : "USUARIO"}
                  </span>
                </td>
                {isAdmin && (
                  <td className="usuarios-table__td" data-label="Acciones">
                    <div className="usuarios-table__td--actions admin-table-actions">
                      <Button
                        variant="danger"
                        size="small"
                        className="usuarios-table__icon-button"
                        onClick={() => onDelete(user.id)}
                        icon={<ICONS.delete />}
                        label="Eliminar"
                        testId={`delete-btn-${user.id}`}
                      />
                      <Button
                        variant="secondary"
                        size="small"
                        className="usuarios-table__icon-button"
                        onClick={() => onEdit(user)}
                        icon={<ICONS.edit />}
                        label="Editar"
                        testId={`edit-btn-${user.id}`}
                      />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {Array.from({ length: Math.max(pageSize - users.length, 0) }, (_, row) =>
            <tr className="usuarios-table__row--data empty-row" aria-hidden="true"
              key={`empty-${row}`}>
              <td colSpan={isAdmin ? 5 : 4}>&nbsp;</td>
            </tr>)}
          </>}
        </tbody>
      </table>
    </div>
    <Pagination currentPage={currentPage + 1} totalPages={Math.max(totalPages, 1)}
      hasPrevious={currentPage > 0} hasNext={currentPage + 1 < totalPages}
      loading={loading} onPrevious={onPrevious} onNext={onNext}
      ariaLabel="Paginación de usuarios" />
  </article>;
};
