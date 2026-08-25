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
import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import { useState } from "react";

export const AlumnoPage: FC = () => {
  const [statusAlert, setStatusAlert] = useState({ isOpen: false, message: "", type: "success" as "success" | "error" });
  const {
    alumnos,
    loading,
    error,
    refetch,
    replaceAlumno,
    currentPage,
    nextPage,
    prevPage,
    hasPrevPage,
    pageSize,
    isLastPage,
    search,
    setSearch,
  } = useAlumnos();

  const navigate = useNavigate();

  const handleEdit = (codigo: string) => {
    navigate(`/students/edit/${codigo}`);
  };

  const handleToggleStatus = async (alumno: import("@/core/A-domain/entities/alumno/Alumno").Alumno) => {
    try {
      const updatedAlumno = await new AlumnoRepositoryImpl().changeStatus(alumno.codigo, !alumno.activo);
      replaceAlumno(updatedAlumno);
      setStatusAlert({ isOpen: true, message: alumno.activo ? "Alumno desactivado." : "Alumno reactivado.", type: "success" });
    } catch {
      setStatusAlert({ isOpen: true, message: "No fue posible cambiar el estado del alumno.", type: "error" });
    }
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

        <div className="page-header__actions mobile-inline-header-actions">
          <Button
            onClick={refetch}
            variant="secondary"
            size="medium"
            className="mobile-compact-header-action"
            icon={<ALUMNOS_ICONS.reload/>}
            iconPosition="left"
            loading={loading}
            label={loading ? "Cargando" : "Recargar"}
          />

          <Button
            onClick={() => navigate("/students/new")}
            variant="primary"
            size="medium"
            className="mobile-compact-header-action"
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
          handleToggleStatus={(alumno) => void handleToggleStatus(alumno)}
         //handleFamilia={handleFamilia}
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
      <ModalAlert isOpen={statusAlert.isOpen} message={statusAlert.message} type={statusAlert.type}
        onClose={() => setStatusAlert((current) => ({ ...current, isOpen: false }))}
        autoCloseTime={2000} variant="toast" />
    </main>
  );
};
