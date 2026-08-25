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

      <form className="form-card alumno-edit-form">
        {/* Campo Nombre */}
        <div className="form-group floating-group alumno-edit-form__group">
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
        <div className="form-group floating-group alumno-edit-form__group">
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

        <div className="form-group floating-group alumno-edit-form__group">
          <SkeletonWrapper isLoading={initialLoading} className="skeleton-name"
            height="48px" width="100%">
            <select id="genero_input" name="genero" value={formData.genero}
              onChange={handleChange} className="form-input">
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="OTROS">Otros</option>
            </select>
          </SkeletonWrapper>
          <label htmlFor="genero_input" className="floating-label form-label">Género</label>
        </div>

        <div className="form-group floating-group alumno-edit-form__group alumno-edit-form__group--wide">
          <SkeletonWrapper
            isLoading={initialLoading}
            className="skeleton-name"
            height="72px"
            width="100%">
            <textarea
              id="observacion_input"
              name="observacion"
              value={formData.observacion ?? ""}
              onChange={handleChange}
              placeholder="Ej.: Mati es alérgico al maní"
              maxLength={300}
              className={`form-input alumno-edit-form__textarea ${fieldErrors.observacion ? 'input-error' : ''}`}
            />
          </SkeletonWrapper>
          <label htmlFor="observacion_input" className="floating-label form-label">
            Mensaje / descripción (opcional)
          </label>
          {fieldErrors.observacion && <span className="error-message">{fieldErrors.observacion}</span>}
        </div>

        <div className="form-actions alumno-edit-form__actions">
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
        autoCloseTime={2000}
        variant={modal.type === "success" ? "toast" : "modal"}
      />
    </div>
  );
};
