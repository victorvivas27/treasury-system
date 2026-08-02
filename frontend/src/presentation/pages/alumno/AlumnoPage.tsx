import { AlumnosList } from "@/presentation/features/alumno/AlumnosList";
import { useAlumnos } from "@/presentation/hooks/alumno/useAlumnos";
import type { FC } from "react";
import "./style/AlumnoPage.css";
import { Button } from "@/shared/ui/button/Button";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import { useNavigate } from "react-router-dom";
import { useDeleteAlumno } from "@/presentation/hooks/alumno/useDeleteAlumno";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";

export const AlumnoPage: FC = () => {
  const {
    alumnos,
    loading,
    error,
    refetch,
    currentPage,
    nextPage,
    prevPage,
    hasPrevPage,
    pageSize,
    isLastPage,
  } = useAlumnos();

  const navigate = useNavigate();

  const handleEdit = (codigo: string) => {
    navigate(`/students/edit/${codigo}`);
  };

  // const handleFamilia = (id: number) => {
  //   navigate(`/students/${id}/parents`);
  // };

  const {
    isDeleting,
    isConfirmOpen,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    alert,
    closeAlert,
  } = useDeleteAlumno(() => {
    if (alumnos.length === 1 && currentPage > 0) {
      prevPage();
    } else {
      refetch();
    }
  });

  return (
    <main className="page-container alumnos-page">
      <header className="page-header">
        <div className="page-header__content">
          <h1 className="page-header__title">Alumnos</h1>
          <p className="page-header__subtitle">
            Administra sus datos escolares y vínculos familiares.
          </p>
        </div>

        <div className="page-header__actions">
          <Button
            onClick={refetch}
            variant="secondary"
            size="medium"
            icon={<ALUMNOS_ICONS.reload/>}
            iconPosition="left"
            loading={loading}
            label={loading ? "Cargando" : "Recargar"}
          />

          <Button
            onClick={() => navigate("/students/new")}
            variant="primary"
            size="medium"
            icon={<ALUMNOS_ICONS.add/>}
            iconPosition="left"
            label="Crear Alumno"
          />
        </div>
      </header>

      <section className="page-content">
        <AlumnosList
          alumnos={alumnos}
          loading={loading || isDeleting}
          error={error}
          onRefresh={refetch}
          handleDelete={openDeleteConfirm}
          handleEdit={handleEdit}
         //handleFamilia={handleFamilia}
          currentPage={currentPage}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          hasPrevPage={hasPrevPage}
          pageSize={pageSize}
          isLastPage={isLastPage}
        />
      </section>

      <ModalConfirm
        isOpen={isConfirmOpen}
        title="¿Eliminar alumno?"
        message="Se eliminará este alumno. Esta acción no se puede deshacer."
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
    </main>
  );
};
