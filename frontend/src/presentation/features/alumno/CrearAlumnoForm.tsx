import { Button } from "@/shared/ui/button/Button";
import { useCreateAlumno } from "@/presentation/hooks/alumno/useCreateAlumno";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import "./style/CrearAlumnoForm.css";

export const CrearAlumnoForm = () => {
  const {
    formData,
    fieldErrors,
    modal,
    handleChange,
    handleActionSubmit,
    navigate,
    closeModal,
  } = useCreateAlumno();

  return (
    <main>
      <form className="form-card-alumno">
        {/* Campo Nombre */}
        <div className="form-group-alumno">
          <input
            id="nombre_input"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Jorge Luis Example"
            className={`form-input-alumno ${fieldErrors.nombre ? 'input-error-alumno' : ''}`}
          />
          <label htmlFor="nombre_input" className="floating-label-alumno form-label-alumno">
            Nombre completo
          </label>
          {fieldErrors.nombre && (
            <span className="error-message-alumno">{fieldErrors.nombre}</span>
          )}
        </div>

        {/* Campo Curso */}
        <div className="form-group-alumno">
          <input
            id="curso_input"
            name="curso"
            value={formData.curso}
            onChange={handleChange}
            placeholder="4A"
            className={`form-input-alumno ${fieldErrors.curso ? 'input-error-alumno' : ''}`}
          />
          <label htmlFor="curso_input" className="floating-label-alumno form-label-alumno">
            Curso
          </label>
          {fieldErrors.curso &&(
          <span className="error-message-alumno">{fieldErrors.curso}</span>
        )}
        </div>

        <div className="form-actions-alumno">
          <Button
            variant="primary"
            size="medium"
            onClick={handleActionSubmit}
            label={"Crear Alumno"}
            icon={<ALUMNOS_ICONS.addCircle />}
          />

          <Button
            variant="danger"
            size="medium"
            onClick={() => navigate("/students")}
            label="Cancelar"
            icon={<ALUMNOS_ICONS.cancel />}
          />
        </div>
      </form>

      <ModalAlert
        isOpen={modal.isOpen}
        message={modal.message}
        type={modal.type}
        onClose={closeModal}
        autoCloseTime={2000}
        variant={modal.type === "success" ? "toast" : "modal"}
      />
    </main>
  );
};
