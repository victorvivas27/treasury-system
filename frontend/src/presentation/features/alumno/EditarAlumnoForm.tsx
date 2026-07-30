import { Button } from "@/shared/ui/button/Button";
import { useEditAlumno } from "@/presentation/hooks/alumno/useEditAlumno";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import { SkeletonWrapper } from "@/shared/ui/skeletonwrapper/SkeletonWrapper";
import "./style/EditarAlumnoForm.css";

export const EditarAlumnoForm = () => {
  const {
    formData,
    loading,
    initialLoading,
    fieldErrors,
    modal,
    handleChange,
    handleSubmit,
    setModal,
    navigate,
    loadError,
  } = useEditAlumno();

  if (loadError) {
    return (
      <FeedbackState
        message={loadError.message}
        onRefresh={() => window.location.reload()}
        type="error"
      />
    );
  }

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
              placeholder="Juan Carlos Perez"
              className={`form-input ${fieldErrors.nombre ? 'input-error' : ''}`}
            />
          </SkeletonWrapper>
          <label htmlFor="nombre_input" className="floating-label form-label">Nombre completo</label>
          {fieldErrors.nombre && <span className="error-message">{fieldErrors.nombre}</span>}
        </div>

        {/* Campo Curso */}
        <div className="form-group floating-group">
          <SkeletonWrapper
            isLoading={initialLoading}
            className="skeleton-name"
            height="48px"
            width="100%">
            <input
              id="curso_input"
              name="curso"
              value={formData.curso}
              onChange={handleChange}
              placeholder="4A"
              className={`form-input ${fieldErrors.curso ? 'input-error' : ''}`}
            />
          </SkeletonWrapper>
          <label htmlFor="curso_input" className="floating-label form-label">Curso</label>
          {fieldErrors.curso && <span className="error-message">{fieldErrors.curso}</span>}
        </div>

        <div className="form-actions">
          <Button
            variant="primary"
            size="medium"
            onClick={handleSubmit}
            loading={loading}
            label={loading ? "Actualizando..." : "Actualizar"}
            icon={<ALUMNOS_ICONS.reload/>}
          />

          <Button
            variant="danger"
            size="medium"
            onClick={() => navigate("/students")}
            label="Cancelar"
            icon={<ALUMNOS_ICONS.cancel/>}
          />
        </div>
      </form>

      <ModalAlert
        isOpen={modal.isOpen}
        message={modal.message}
        type={modal.type}
        onClose={() => setModal({ ...modal, isOpen: false })}
        autoCloseTime={2500}
      />
    </div>
  );
};
