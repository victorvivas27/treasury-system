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
import "./UsersPage.css";

export const UsersPage = () => {
  const { user } = useAuth();
  const { users, loading, error, totalPages, pageSize, load, create, update, remove } = useUsers();
  const [currentPage, setCurrentPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error";
  }>({ isOpen: false, message: "", type: "success" });

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (payload: UserPayload) => {
    await create(payload, 0);
    setCurrentPage(0);
    setShowForm(false);
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
      setDeleteAlert({
        isOpen: true,
        message: "Usuario eliminado correctamente.",
        type: "success",
      });
    } catch {
      setDeleteAlert({
        isOpen: true,
        message: "No fue posible eliminar el usuario.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) return <FeedbackState message={error} onRefresh={() => load()} />;

  return (
    <main className="users-page">
      <header className="users-page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p>Visualiza y administra los usuarios registrados en el sistema.</p>
        </div>
        {user?.rol === "ADMIN" && (
          <Button
            label={showForm ? "Cerrar formulario" : "Crear usuario"}
              onClick={() => {
                setEditingUser(null);
                setShowForm((visible) => !visible);
              }}
            size="medium"
          />
        )}
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
        {!loading && users.length === 0 ? (
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
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
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
        title="Eliminar usuario"
        message={`¿Estás seguro de eliminar a ${userToDelete?.nombre ?? "este usuario"}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setUserToDelete(null)}
      />

      <ModalAlert
        isOpen={deleteAlert.isOpen}
        message={deleteAlert.message}
        type={deleteAlert.type}
        onClose={() => setDeleteAlert((current) => ({ ...current, isOpen: false }))}
        autoCloseTime={2500}
      />
    </main>
  );
};
