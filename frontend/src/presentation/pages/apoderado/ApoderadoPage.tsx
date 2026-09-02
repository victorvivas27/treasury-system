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
import { useState } from "react";
import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { useOptionalAuth } from "@/presentation/context/AuthContext";

const GUARDIANS_RETURN_PAGE_KEY = "guardians:returnPage";

const consumeSavedPage = () => {
  try {
    const value = window.sessionStorage.getItem(GUARDIANS_RETURN_PAGE_KEY);
    window.sessionStorage.removeItem(GUARDIANS_RETURN_PAGE_KEY);
    const page = value ? Number(value) : 0;
    return Number.isInteger(page) && page >= 0 ? page : 0;
  } catch {
    return 0;
  }
};

export const ApoderadoPage: FC = () => {
  const auth = useOptionalAuth();
  const token = auth?.token;
  const [initialPage] = useState(consumeSavedPage);
  const [accessGuardian, setAccessGuardian] = useState<Apoderado | null>(null);
  const [enablingAccess, setEnablingAccess] = useState(false);
  const [accessAlert, setAccessAlert] = useState({
    isOpen: false, message: "", type: "success" as "success" | "error",
  });
  const toggleStatus = async (apoderado: Apoderado) => {
    try {
      const updatedApoderado = await new ApoderadoRepositoryImpl()
        .changeStatus(apoderado.codigo, !apoderado.activo);
      replaceApoderado(updatedApoderado);
      setAccessAlert({ isOpen: true,
        message: apoderado.activo ? "Apoderado desactivado." : "Apoderado reactivado.",
        type: "success" });
    } catch {
      setAccessAlert({ isOpen: true, message: "No fue posible cambiar el estado del apoderado.", type: "error" });
    }
  };
  const {
    apoderados,
    loading,
    error,
    refetch,
    replaceApoderado,
    currentPage,
    nextPage,
    prevPage,
    hasPrevPage,
    pageSize,
    isLastPage,
    search,
    setSearch,
  } = useApoderados({ initialPage });
  const handleEdit = (codigo: string) => {
    try {
      window.sessionStorage.setItem(GUARDIANS_RETURN_PAGE_KEY, String(currentPage));
    } catch {
      undefined;
    }
    navigate(`/parents/edit/${codigo}`);
  };

  const {
    isDeleting,
    isConfirmOpen,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    alert,
    closeAlert,
  } = useDeleteApoderado(() => {
    if (apoderados.length === 1 && currentPage > 0) {
      prevPage();
    } else {
      refetch();
    }
  });

  const navigate = useNavigate();

  const confirmEnableAccess = async () => {
    if (!accessGuardian || enablingAccess) return;
    const guardian = accessGuardian;
    setEnablingAccess(true);
    try {
      await new ApoderadoRepositoryImpl().enableAccess(
        guardian.codigo, token ?? undefined);
      setAccessGuardian(null);
      setAccessAlert({ isOpen: true,
        message: "Invitación enviada. El apoderado figura como usuario pendiente.",
        type: "success" });
      refetch();
    } catch {
      setAccessGuardian(null);
      setAccessAlert({ isOpen: true,
        message: "No fue posible habilitar el acceso del apoderado.", type: "error" });
    } finally {
      setEnablingAccess(false);
    }
  };


  return (
    <main className="page-container apoderados-page">
      <header className="page-header">
        <div className="page-header__content">
          <h1 className="page-header__title">Gestión de Apoderados</h1>
          <p className="page-header__subtitle">
            Visualiza y administra la información de contacto de los padres y apoderados.
          </p>
        </div>

        <div className="page-header__actions mobile-inline-header-actions">
          <Button
            onClick={refetch}
            variant="secondary"
            size="medium"
            className="mobile-compact-header-action"
            icon={<APODERADOS_ICONS.reload />}
            iconPosition="left"
            loading={loading}
            label={loading ? "Cargando" : "Recargar"}
          />


          <Button
            onClick={() => navigate("/parents/new")}
            variant="primary"
            size="medium"
            className="apoderados-page__create-button mobile-compact-header-action"
            icon={<APODERADOS_ICONS.add  />}
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
          handleDelete={(codigo) => openDeleteConfirm(String(codigo))}
          handleEdit={handleEdit}
          handleEnableAccess={setAccessGuardian}
          handleToggleStatus={(apoderado) => void toggleStatus(apoderado)}
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
        title="¿Eliminar apoderado?"
        message="Se eliminará este apoderado. Esta acción no se puede deshacer."
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
      <ModalConfirm isOpen={Boolean(accessGuardian)} title="Habilitar acceso"
        message={`Se enviará una invitación a ${accessGuardian?.email ?? ""} para que defina su contraseña.`}
        confirmLabel="Enviar invitación" isLoading={enablingAccess}
        compact
        onCancel={() => setAccessGuardian(null)}
        onConfirm={() => void confirmEnableAccess()} />
      <ModalAlert isOpen={accessAlert.isOpen} message={accessAlert.message}
        type={accessAlert.type}
        variant={accessAlert.type === "success" ? "toast" : "modal"}
        autoCloseTime={accessAlert.type === "success" ? 2000 : 0}
        onClose={() => setAccessAlert(current => ({
          ...current, isOpen: false,
        }))} />
    </main>
  );
};
