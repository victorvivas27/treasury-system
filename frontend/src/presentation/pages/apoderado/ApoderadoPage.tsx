import { ApoderadosList } from "@/presentation/features/apoderado/ApoderadosList";
import { useApoderados } from "@/presentation/hooks/apoderado/useApoderados";
import type { FC } from "react";
import "./style/ApoderadoPage.css";
import { Button } from "@/shared/ui/button/Button";
import { APODERADOS_ICONS } from "@/shared/constants/Icons";
import { useNavigate } from "react-router-dom";
import { useDeleteApoderado } from "@/presentation/hooks/apoderado/useDeleteApoderado";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";



export const ApoderadoPage: FC = () => {
  const { apoderados, loading, error, refetch } = useApoderados();

  const {
    isDeleting,
    isConfirmOpen,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    alert,
    closeAlert,
  } = useDeleteApoderado(refetch);
  const navigate = useNavigate();

  return (
    <main className="page-container">
      <header className="page-header">
        <div className="page-header__content">
          <h1 className="page-header__title">Gestión de Apoderados</h1>
          <p className="page-header__subtitle">
            Visualiza y administra la información de contacto de los padres y apoderados.
          </p>
        </div>

        <div className="page-header__actions">
          <Button
            onClick={refetch}
            variant="secondary"
            size="medium"
            icon={<APODERADOS_ICONS.reload style={{margin:"3px"}}/>}
            iconPosition="left"
            loading={loading}
            label={loading ? "Cargando" : "Recargar"}
          />


          <Button
            onClick={() => navigate("/parents/new")}
            variant="primary"
            size="medium"
            icon={<APODERADOS_ICONS.add style={{margin:"3px"}}/>}
            iconPosition="left"
            label="Crear Apoderado"
          />

        </div>
      </header>

      <section className="page-content">
        <ApoderadosList
          apoderados={apoderados}
          loading={loading || isDeleting}
          error={error}
          onRefresh={refetch}
          handleDelete={openDeleteConfirm}
        />
      </section>

      <ModalConfirm
        isOpen={isConfirmOpen}
        title="Eliminar apoderado"
        message="¿Estás seguro de eliminar este apoderado? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
      />

      <ModalAlert
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={closeAlert}
        autoCloseTime={2500}
      />
    </main>
  );
};
