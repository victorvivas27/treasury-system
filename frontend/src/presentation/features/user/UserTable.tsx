import type { User } from "@/core/A-domain/entities/user/User";
import { ICONS } from "@/shared/constants/Icons";
import { Button } from "@/shared/ui/button/Button";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import "./UserTable.css";

interface UserTableProps {
  users: User[];
  loading?: boolean;
  isAdmin: boolean;
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
}

export const UserTable = ({ users, loading = false, isAdmin, onEdit, onDelete }: UserTableProps) => (
  <article className="usuarios-container responsive-data-list">
    <header className="usuarios-header">
      <h2 className="usuarios-header__title">Lista de Usuarios</h2>
    </header>

    <div className="usuarios-table-wrapper">
      <table className="usuarios-table">
        <thead>
          <tr>
            <th className="usuarios-table__th">Código</th>
            <th className="usuarios-table__th">Nombre</th>
            <th className="usuarios-table__th">Correo</th>
            <th className="usuarios-table__th">Rol</th>
            <th className="usuarios-table__th">Estado</th>
            {isAdmin && <th className="usuarios-table__th">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 8 }, (_, row) => (
            <tr key={`loading-${row}`} className="usuarios-table__row--data"
              aria-hidden="true">
              {Array.from({ length: isAdmin ? 6 : 5 }, (_, column) => (
                <td className="usuarios-table__td" key={column}>
                  <div className="skeleton-block usuarios-table__skeleton" />
                </td>
              ))}
            </tr>
          )) : users.map((user) => {
            const isActive = user.enabled && user.accountNonLocked;
            return (
              <tr key={user.id} className="usuarios-table__row--data">
                <td className="usuarios-table__td" data-label="Código">{user.code}</td>
                <td className="usuarios-table__td" data-label="Nombre">{user.nombre}</td>
                <td className="usuarios-table__td usuarios-table__email" data-label="Correo">{user.correo}</td>
                <td className="usuarios-table__td" data-label="Rol"><span className="usuarios-role">{user.rol}</span></td>
                <td className="usuarios-table__td" data-label="Estado">
                  <span className={`usuarios-status ${isActive ? "is-active" : "is-inactive"}`}>
                    {isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {isAdmin && (
                  <td className="usuarios-table__td" data-label="Acciones">
                    <div className="usuarios-table__td--actions">
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => onDelete(user.id)}
                        icon={<ICONS.delete />}
                        testId={`delete-btn-${user.id}`}
                      />
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => onEdit(user)}
                        icon={<ICONS.edit />}
                        testId={`edit-btn-${user.id}`}
                      />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </article>
);
