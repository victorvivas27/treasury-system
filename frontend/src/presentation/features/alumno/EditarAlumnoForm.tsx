import { Button } from "@/shared/ui/button/Button";
import "./style/EditarAlumnoForm.css";
import { useEditAlumno } from "@/presentation/hooks/alumno/useEditAlumno";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";

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

  if (initialLoading) {
    return (
      <div className="form-view-container">
        <div className="form-card">
          <div className="skeleton-block skeleton-input" style={{ height: "60px" }} />
          <div className="skeleton-block skeleton-input" style={{ height: "60px" }} />
          <div className="skeleton-block skeleton-input" style={{ height: "60px" }} />
        </div>
      </div>
    );
  }

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
        <div className="form-group floating-group">
          <input
            id="nombre_input"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Juan Carlos Perez"
            className={`form-input ${fieldErrors.nombre ? 'input-error' : ''}`}
          />
          <label htmlFor="nombre_input" className="floating-label form-label">Nombre completo</label>
          {fieldErrors.nombre && <span className="error-message">{fieldErrors.nombre}</span>}
        </div>

        <div className="form-group floating-group">
          <input
            id="curso_input"
            name="curso"
            value={formData.curso}
            onChange={handleChange}
            placeholder="4A"
            className={`form-input ${fieldErrors.curso ? 'input-error' : ''}`}
          />
          <label htmlFor="curso_input" className="floating-label form-label">Curso</label>
          {fieldErrors.curso && <span className="error-message">{fieldErrors.curso}</span>}
        </div>

        <div className="form-group floating-group">
          <input
            id="apoderadoId_input"
            name="apoderadoId"
            type="number"
            value={formData.apoderadoId || ''}
            onChange={handleChange}
            placeholder="1"
            className={`form-input ${fieldErrors.apoderadoId ? 'input-error' : ''}`}
          />
          <label htmlFor="apoderadoId_input" className="floating-label form-label">ID del Apoderado</label>
          {fieldErrors.apoderadoId && <span className="error-message">{fieldErrors.apoderadoId}</span>}
        </div>

        <div className="form-actions">
          <Button
            variant="primary"
            size="medium"
            onClick={handleSubmit}
            loading={loading}
            label={loading ? "Actualizando..." : "Actualizar"}
            icon={<ALUMNOS_ICONS.save style={{ margin: "3px" }} />}
          />

          <Button
            variant="secondary"
            size="medium"
            onClick={() => navigate("/students")}
            label="Cancelar"
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
