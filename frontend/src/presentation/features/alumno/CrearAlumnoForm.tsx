import { Button } from "@/shared/ui/button/Button";
import "./style/CrearAlumnoForm.css";
import { useCreateAlumno } from "@/presentation/hooks/alumno/useCreateAlumno";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";

export const CrearAlumnoForm = () => {
  const {
    formData,
    loading,
    fieldErrors,
    modal,
    handleChange,
    handleActionSubmit,
    navigate,
    setModal,
  } = useCreateAlumno();

  return (
    <div className="form-view-container">
      <form className="form-card">
        <div className="form-group floating-group">
          <input
            id="nombre_input"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Juan Carlos Perez Example"
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
            onClick={handleActionSubmit}
            loading={loading}
            label={loading ? "Guardando..." : "Guardar"}
            icon={<ALUMNOS_ICONS.add style={{ margin: "3px" }} />}
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
