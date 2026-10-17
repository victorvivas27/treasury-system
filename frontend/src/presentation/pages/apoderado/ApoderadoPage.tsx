import axios from "axios";
import { useGuardianInvitation } from "@/presentation/hooks/apoderado/useGuardianInvitation";
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
import { useEffect, useState } from "react";
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
  const [invitationAnchor, setInvitationAnchor] = useState<{ top: number; left: number }>();
  useEffect(() => {
    if (!accessGuardian) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [accessGuardian]);
  const [channel, setChannel] = useState("email");
  const [consent, setConsent] = useState(false);
  const [consentSource, setConsentSource] = useState("");
  const [consentDate, setConsentDate] = useState("");
  const { invitation, error: invitationError, reload: reloadInvitation } = useGuardianInvitation(accessGuardian?.codigo);
  const openInvitation = (guardian: Apoderado) => {
    setChannel("email"); setConsent(false); setConsentSource(""); setConsentDate("");
    const rect = document.activeElement?.getBoundingClientRect();
    setInvitationAnchor(rect && window.innerWidth >= 600 ? {
      top: Math.max(16, Math.min(rect.top, window.innerHeight - 536)),
      left: Math.max(16, Math.min(rect.left - 280, window.innerWidth - 296)),
    } : undefined);
    setAccessGuardian(guardian);
  };
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
      if (channel === "whatsapp") {
        const result = await new ApoderadoRepositoryImpl().inviteWhatsApp(guardian.codigo,
          { authorized: consent, source: consentSource, authorizedAt: `${consentDate}T00:00:00` });
        reloadInvitation();
        setAccessAlert({ isOpen: true, type: result.deliveryStatus === "FAILED" ? "error" : "success",
          message: result.deliveryStatus === "FAILED" ? "Meta no pudo aceptar el mensaje. Consulta el estado antes de reintentar."
            : result.simulated ? "Invitación simulada. No se envió ningún mensaje real."
            : "Meta acepto el mensaje. La entrega está pendiente de confirmacion." });
        refetch();
        return;
      }
      await new ApoderadoRepositoryImpl().enableAccess(guardian.codigo, token ?? undefined);
      setAccessGuardian(null);
      setAccessAlert({ isOpen: true,
        message: "Invitación enviada. El apoderado figura como usuario pendiente.",
        type: "success" });
      refetch();
    } catch (error) {
      const errors = axios.isAxiosError(error) ? error.response?.data?.errors : null;
      const detail = errors && typeof errors === "object" ? Object.values(errors).find(value => typeof value === "string") : null;
      setAccessAlert({ isOpen: true,
        message: typeof detail === "string" ? detail : "No fue posible habilitar el acceso del apoderado.", type: "error" });
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
          handleEnableAccess={openInvitation}
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
      <ModalConfirm isOpen={Boolean(accessGuardian)} title="Habilitar acceso" anchor={invitationAnchor} containerClassName="guardian-invitation-modal"
        message={channel === "whatsapp" ? `Invitar por WhatsApp a ${accessGuardian?.telefono ?? ""}.`
          : `Se enviará una invitación a ${accessGuardian?.email ?? ""} para que defina su contraseña.`}
        confirmDisabled={channel === "whatsapp" && (!consent || !consentSource.trim() || !consentDate || invitation?.status === "ACTIVATED")}
        confirmLabel="Enviar invitación" isLoading={enablingAccess}
        compact
        onCancel={() => setAccessGuardian(null)}
        onConfirm={() => void confirmEnableAccess()}>
        <div className="guardian-invitation-fields">
          <label>Canal<select value={channel} disabled={enablingAccess} onChange={event => setChannel(event.target.value)}>
            <option value="email">Correo electrónico</option><option value="whatsapp">WhatsApp</option>
          </select></label>
          {channel === "whatsapp" && <>
            <p role="status">{invitationError || (!invitation ? "Consultando estado..." :
              invitation.status === "ACTIVATED" ? "Cuenta activada" : invitation.status === "NONE" ? "Sin invitación por WhatsApp" :
              `${({ PENDING: "Activación pendiente", EXPIRED: "Invitación vencida", SUPERSEDED: "Invitación reemplazada" } as Record<string, string>)[invitation.status]} · ${
                ({ ACCEPTED: "Aceptado por Meta", DELIVERED: "Entregado", FAILED: "Error de envío", SIMULATED: "Envío simulado", PENDING: "Pendiente", SEND_REQUESTED: "Envío solicitado" } as Record<string, string>)[invitation.deliveryStatus ?? ""]}`)}</p>
            {invitation?.errorCode && <p role="alert">No se pudo enviar o entregar el mensaje. Revisa el número y la configuración de WhatsApp.</p>}
            <Button label="Consultar estado" variant="secondary" size="small" onClick={reloadInvitation} />
            <label><input type="checkbox" checked={consent} disabled={enablingAccess} onChange={event => setConsent(event.target.checked)} />El apoderado autorizó recibir mensajes por WhatsApp</label>
            <label>Fuente de autorización<input maxLength={200} value={consentSource} disabled={enablingAccess} onChange={event => setConsentSource(event.target.value)} placeholder="Ej: formulario firmado" /></label>
            <label>Fecha de autorización<input type="date" value={consentDate} disabled={enablingAccess} onChange={event => setConsentDate(event.target.value)} /></label>
          </>}
        </div>
      </ModalConfirm>
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
