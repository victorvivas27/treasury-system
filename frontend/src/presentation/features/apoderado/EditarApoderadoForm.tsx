// components/apoderado/EditarApoderadoForm.tsx
import { Button } from "@/shared/ui/button/Button";
import "./style/CrearApoderadoForm.css";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { APODERADOS_ICONS } from "@/shared/constants/Icons";
import { SkeletonWrapper } from "@/shared/ui/skeletonwrapper/SkeletonWrapper";
import { useEditApoderado } from "@/presentation/hooks/apoderado/useEditApoderado";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { FcHighPriority } from "react-icons/fc";
import { useEffect, useState } from "react";


export const EditarApoderadoForm = () => {
  const {
    formData,
    loading,
    fieldErrors,
    modal,
    handleChange,
    handleSubmit,
    setModal,
    navigate,
    initialLoading,
    loadError
  } = useEditApoderado();
  const [observacionesOpen, setObservacionesOpen] = useState(false);

  useEffect(() => {
    if (!initialLoading && formData.observaciones?.trim()) {
      setObservacionesOpen(true);
    }
  }, [initialLoading, formData.observaciones]);

  if (loadError) {
    return (
      <FeedbackState
        message={loadError.message}
        type="error"
        icon={<FcHighPriority />}
      />
    );
  }


  return (
    <main>

      <form className="form-card-apoderado">
        {/* Campo Nombre */}
        <div className="form-group-apoderado">
          <SkeletonWrapper
            isLoading={initialLoading}
            className="skeleton-name"
            height="48px"
            width="100%">
            <input
              id="nombre_input"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Juan Carlos Perez Example"
              className={`form-input-apoderado ${fieldErrors.nombre ?
                'input-error-apoderado input-error' : ''}`}
            />
          </SkeletonWrapper>
          <label htmlFor="nombre_input" className="floating-label-apoderado form-label-apoderado">
            Nombre completo
          </label>
          {fieldErrors.nombre &&(
           <span className="error-message-apoderado">{fieldErrors.nombre}</span>
           )}

        </div>

        {/* Campo Email */}
        <div className="form-group-apoderado">
          <SkeletonWrapper
            isLoading={initialLoading}
            className="skeleton-name"
            height="48px"
            width="100%">
            <input
              id="email_input"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ejemplo@email.com"
              className={`form-input-apoderado ${fieldErrors.email ?
                 'input-error-apoderado input-error' : ''}`}
            />
          </SkeletonWrapper>
          <label htmlFor="email_input" className="floating-label-apoderado form-label-apoderado">
            Email
          </label>
          {fieldErrors.email &&(
           <span className="error-message-apoderado">{fieldErrors.email}</span>
           )}
        </div>

        {/* Campo Teléfono */}
        <div className="form-group-apoderado">
          <SkeletonWrapper
            isLoading={initialLoading}
            className="skeleton-name"
            height="48px"
            width="100%">
            <input
              id="telefono_input"
              name="telefono"
              type="tel"
              inputMode="tel"
              aria-describedby={fieldErrors.telefono ? "telefono_error" : undefined}
              aria-invalid={Boolean(fieldErrors.telefono)}
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+56 9 8888 8888"
              className={`form-input-apoderado ${fieldErrors.telefono ?
                 'input-error-apoderado input-error' : ''}`}
            />
          </SkeletonWrapper>
          <label htmlFor="telefono_input" className="floating-label-apoderado form-label-apoderado">
            Teléfono
          </label>
          {fieldErrors.telefono &&(
          <span id="telefono_error" className="error-message-apoderado" role="alert">
            {fieldErrors.telefono}
          </span>
          )}
        </div>

        <details
          className="apoderado-observaciones"
          open={observacionesOpen}
          onToggle={(event) => setObservacionesOpen(event.currentTarget.open)}
        >
          <summary>Observaciones <span>(opcional)</span></summary>
          <div className="form-group-apoderado apoderado-observaciones__content">
          <label htmlFor="observaciones_input" className="form-label-apoderado">
            Observaciones
            </label>
          <SkeletonWrapper
            isLoading={initialLoading}
            className="skeleton-name"
            height="48px"
            width="100%">
            <textarea
              id="observaciones_input"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              className="form-input-apoderado"
              placeholder="Escribe aquí..."
            />
          </SkeletonWrapper>
          </div>
        </details>
        <div className="form-actions">
          <Button
            variant="primary"
            size="medium"
            onClick={handleSubmit}
            loading={loading}
            label={loading ? "Actualizando Apoderado" : "Actualizar"}
            icon={<APODERADOS_ICONS.reload />}
          />

          <Button
            variant="danger"
            size="medium"
            onClick={() => navigate("/parents")}
            label="Cancelar"
            icon={<APODERADOS_ICONS.cancel />}
          />
        </div>
      </form>



      <ModalAlert
        isOpen={modal.isOpen}
        message={modal.message}
        type={modal.type}
        onClose={() => {
          setModal(prev => ({ ...prev, isOpen: false }));
          if (modal.type === "success") {
            navigate("/parents");
          }
        }}
        autoCloseTime={2000}
        variant={modal.type === "success" ? "toast" : "modal"}
      />
    </main>
  );
};
