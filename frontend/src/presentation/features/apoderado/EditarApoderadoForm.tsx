// components/apoderado/EditarApoderadoForm.tsx
import { Button } from "@/shared/ui/button/Button";
import "./style/CrearApoderadoForm.css"; // Reutilizamos el mismo CSS
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { APODERADOS_ICONS } from "@/shared/constants/Icons";
import { SkeletonWrapper } from "@/shared/ui/skeletonwrapper/SkeletonWrapper";
import { useEditApoderado } from "@/presentation/hooks/apoderado/useEditApoderado";

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
    initialLoading
  } = useEditApoderado();


  return (
    <div className="form-view-container">

      <form className="form-card">
        {/* Campo Nombre */}
        <div className="form-group floating-group">
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
              className={`form-input ${fieldErrors.nombre ? 'input-error' : ''}`}
            />
          </SkeletonWrapper>
          <label htmlFor="nombre_input" className="floating-label form-label">
            Nombre completo
          </label>
          {fieldErrors.nombre && <span className="error-message">{fieldErrors.nombre}</span>}

        </div>

        {/* Campo Email */}
        <div className="form-group floating-group">
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
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
            />
          </SkeletonWrapper>
          <label htmlFor="email_input" className="floating-label form-label">
            Email
          </label>
          {fieldErrors.email && <span className="error-message">{fieldErrors.email}</span>}
        </div>

        {/* Campo Teléfono */}
        <div className="form-group floating-group">
          <SkeletonWrapper
            isLoading={initialLoading}
            className="skeleton-name"
            height="48px"
            width="100%">
            <input
              id="telefono_input"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+56 9 8888 8888"
              className={`form-input ${fieldErrors.telefono ? 'input-error' : ''}`}
            />
          </SkeletonWrapper>
          <label htmlFor="telefono_input" className="floating-label form-label">
            Teléfono
          </label>
          {fieldErrors.telefono && <span className="error-message">{fieldErrors.telefono}</span>}
        </div>

        {/* Campo Observaciones */}
        <div className="form-group col-span-3">
          <label htmlFor="observaciones_input" className="form-label">Observaciones</label>
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
              className="form-input form-textarea"
              placeholder="Escribe aquí..."
            />
          </SkeletonWrapper>
        </div>
      </form>

      <Button
        type="button"
        disabled={loading}
        loading={loading}
        icon={<APODERADOS_ICONS.reload style={{ margin: "3px" }} />}
        label={loading ? "Actualizando Apoderado" : "Actualizar Apoderado"}
        onClick={handleSubmit}
        variant="primary"
        size="medium"
      />

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
      />
    </div>
  );
};
