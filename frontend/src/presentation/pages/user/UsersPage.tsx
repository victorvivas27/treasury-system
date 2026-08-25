import { useEffect, useState } from "react";
import type { User, UserPayload } from "@/core/A-domain/entities/user/User";
import { useAuth } from "@/presentation/context/AuthContext";
import { UserForm } from "@/presentation/features/user/UserForm";
import { UserTable } from "@/presentation/features/user/UserTable";
import { useUsers } from "@/presentation/hooks/user/useUsers";
import { Button } from "@/shared/ui/button/Button";
import { EmptyState } from "@/shared/ui/emptystate/EmptyState";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { FiRefreshCw, FiUserPlus, FiX } from "react-icons/fi";
import { UserRepositoryImpl } from "@/core/C-infra/repositories/user/UserRepositoryImpl";
import "./UsersPage.css";

export const UsersPage = () => {
  const { user } = useAuth();
  const { users, loading, error, totalPages, pageSize, load, create, update, remove,
    search, setSearch } = useUsers();
  const [currentPage, setCurrentPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userAlert, setUserAlert] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error";
  }>({ isOpen: false, message: "", type: "success" });

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (payload: UserPayload) => {
    try {
      await create(payload, 0);
      setCurrentPage(0);
      setShowForm(false);
      setUserAlert({
        isOpen: true,
        message: "Usuario creado correctamente.",
        type: "success",
      });
    } catch {
      setUserAlert({
        isOpen: true,
        message: "No fue posible crear el usuario.",
        type: "error",
      });
    }
  };

  const handleUpdate = async (payload: UserPayload) => {
    if (!editingUser) return;
    await update(editingUser.id, payload, currentPage);
    setEditingUser(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const targetPage = users.length === 1 && currentPage > 0
        ? currentPage - 1 : currentPage;
      await remove(userToDelete.id, targetPage);
      setCurrentPage(targetPage);
      setUserToDelete(null);
      setUserAlert({
        isOpen: true,
        message: "Usuario eliminado correctamente.",
        type: "success",
      });
    } catch {
      setUserAlert({
        isOpen: true,
        message: "No fue posible eliminar el usuario.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStatus = async (selectedUser: User) => {
    try {
      await new UserRepositoryImpl().changeStatus(selectedUser.id, !selectedUser.enabled);
      await load(currentPage);
      setUserAlert({ isOpen: true,
        message: selectedUser.enabled ? "Usuario desactivado." : "Usuario reactivado.",
        type: "success" });
    } catch {
      setUserAlert({ isOpen: true, message: "No fue posible cambiar el estado del usuario.",
        type: "error" });
    }
  };

  if (error) return <FeedbackState message={error} onRefresh={() => load()} />;

  return (
    <main className="users-page">
      <header className="users-page-header">
        <div>
          <h1>Usuarios</h1>
          <p>Administra accesos, roles y estado de las cuentas.</p>
        </div>
        <div className="users-page-header__actions">
          <Button
            label={loading ? "Cargando" : "Recargar"}
            icon={<FiRefreshCw aria-hidden="true" />}
            variant="secondary"
            loading={loading}
            onClick={() => void load(currentPage)}
            size="medium"
            className="mobile-compact-header-action"
          />
          {user?.rol === "ADMIN" && (
            <Button
              label={showForm ? "Cerrar formulario" : "Crear usuario"}
              icon={showForm ? <FiX aria-hidden="true" /> : <FiUserPlus aria-hidden="true" />}
              onClick={() => {
                setEditingUser(null);
                setShowForm((visible) => !visible);
              }}
              size="medium"
              className="mobile-compact-header-action"
            />
          )}
        </div>
      </header>

      {showForm && (
        <UserForm loading={loading} onSubmit={handleCreate} onCancel={closeForm} />
      )}

      {editingUser && (
        <UserForm
          initialData={editingUser}
          loading={loading}
          submitLabel="Actualizar usuario"
          onSubmit={handleUpdate}
          onCancel={closeForm}
          showRole={false}
        />
      )}

      <section>
        {!loading && users.length === 0 && !search.trim() ? (
          <EmptyState title="Sin usuarios" message="No hay usuarios registrados." />
        ) : (
          <UserTable
            users={users}
            loading={loading}
            isAdmin={user?.rol === "ADMIN"}
            onEdit={(selectedUser) => {
              setShowForm(false);
              setEditingUser(selectedUser);
            }}
            onDelete={(id) => {
              const selectedUser = users.find((listedUser) => listedUser.id === id);
              if (selectedUser) setUserToDelete(selectedUser);
            }}
            onToggleStatus={(selectedUser) => void toggleStatus(selectedUser)}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            search={search}
            onSearchChange={(value) => {
              setCurrentPage(0);
              setSearch(value);
            }}
            onPrevious={() => {
              const page = currentPage - 1;
              setCurrentPage(page);
              void load(page);
            }}
            onNext={() => {
              const page = currentPage + 1;
              setCurrentPage(page);
              void load(page);
            }}
          />
        )}
      </section>

      <ModalConfirm
        isOpen={Boolean(userToDelete)}
        title="¿Eliminar usuario?"
        message={`Se eliminará a ${userToDelete?.nombre ?? "este usuario"}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        compact
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setUserToDelete(null)}
      />

      <ModalAlert
        isOpen={userAlert.isOpen}
        message={userAlert.message}
        type={userAlert.type}
        onClose={() => setUserAlert((current) => ({ ...current, isOpen: false }))}
        autoCloseTime={2000}
        variant={userAlert.type === "success" ? "toast" : "modal"}
      />
    </main>
  );
};
