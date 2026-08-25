import { FamiliaList } from "@/presentation/features/familia/FamiliaList";
import { useDeleteFamilia } from "@/presentation/hooks/familia/useDeleteFamilia";
import { useListFamilia } from "@/presentation/hooks/familia/useListFamilia";
import { FAMILIA_ICONS } from "@/shared/constants/Icons";
import { Button } from "@/shared/ui/button/Button";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";



export const FamiliaPage: FC = () => {
  const [statusAlert, setStatusAlert] = useState({ isOpen: false, message: "", type: "success" as "success" | "error" });

  const {
    familia,
    loading,
    error,
    refetch,
    updateFamiliaStatus,
    currentPage,
    nextPage,
    prevPage,
    hasPrevPage,
    pageSize,
    isLastPage,
    search,
    setSearch,
  } = useListFamilia();

  const handleEdit = (id: number) => {
    navigate(`/family/edit/${id}`);
  };

  const {
    isDeleting,
    isConfirmOpen,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    alert,
    closeAlert,
  } = useDeleteFamilia(refetch);
  const navigate = useNavigate();
  const toggleStatus = async (familiaId: number, activo: boolean) => {
    try {
      await new FamiliaRepositoryImpl().changeStatus(familiaId, !activo);
      updateFamiliaStatus(familiaId, !activo);
      setStatusAlert({ isOpen: true, message: activo ? "Familia desactivada." : "Familia reactivada.", type: "success" });
    } catch {
      setStatusAlert({ isOpen: true, message: "No fue posible cambiar el estado de la familia.", type: "error" });
    }
  };

  return (
    <main className="page-container">
      <header className="page-header">
        <div className="page-header__content">
          <h1 className="page-header__title">Gestión de familias</h1>
          <p className="page-header__subtitle">
            Visualiza y administra la información de las familias.
          </p>
        </div>

        <div className="page-header__actions mobile-inline-header-actions">
          <Button
            onClick={refetch}
            variant="secondary"
            size="medium"
            className="mobile-compact-header-action"
            icon={<FAMILIA_ICONS.reload />}
            iconPosition="left"
            loading={loading}
            label={loading ? "Cargando" : "Recargar"}
          />


          <Button
            onClick={() => navigate("/family/new")}
            variant="primary"
            size="medium"
            className="mobile-compact-header-action"
            icon={<FAMILIA_ICONS.crearFamilia />}
            iconPosition="left"
            label="Crear familia"
          />

        </div>
      </header>

      <section className="page-content">
        <FamiliaList
          familias={familia}
          loading={loading || isDeleting}
          error={error}
          onRefresh={refetch}
          handleDelete={openDeleteConfirm}
          handleEdit={handleEdit}
          handleToggleStatus={(item) => void toggleStatus(item.familiaId, item.activo)}
          currentPage={currentPage}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          hasPrevPage={hasPrevPage}
          pageSize={pageSize}
          isLastPage={isLastPage}
          search={search}
          onSearchChange={setSearch}
        />
      </section>

      <ModalConfirm
        isOpen={isConfirmOpen}
        title="¿Eliminar familia?"
        message="Se eliminará esta familia. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        compact
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
      />

      <ModalAlert
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={closeAlert}
        autoCloseTime={2000}
        variant={alert.type === "success" ? "toast" : "modal"}
      />
      <ModalAlert isOpen={statusAlert.isOpen} message={statusAlert.message} type={statusAlert.type}
        onClose={() => setStatusAlert((current) => ({ ...current, isOpen: false }))}
        autoCloseTime={2000} variant="toast" />
    </main>
  );
};
