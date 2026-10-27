import { LoadingState } from "@/shared/ui/loading/LoadingState";
import { Button } from "@/shared/ui/button/Button";
import { useCreateAlumno } from "@/presentation/hooks/alumno/useCreateAlumno";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import "./style/CrearAlumnoForm.css";

export const CrearAlumnoForm = () => {
  const {
    formData,
    loading,
    fieldErrors,
    courses = [],
    loadingCourses = false,
    coursesError = "",
    modal,
    handleChange,
    handleActionSubmit,
    navigate,
    closeModal,
  } = useCreateAlumno();

  return (
    <main>
      <form inert={loading} aria-busy={loading} onSubmit={event => { event.preventDefault(); void handleActionSubmit(); }} className="form-card-alumno">
        {/* Campo Nombre */}
        <div className="form-group-alumno">
          <input
            id="nombre_input"
            name="nombre"
            aria-invalid={Boolean(fieldErrors.nombre)}
            aria-describedby={fieldErrors.nombre ? "alumno-nombre-error" : undefined}
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Jorge Luis Example"
            className={`form-input-alumno ${fieldErrors.nombre ? 'input-error-alumno' : ''}`}
          />
          <label htmlFor="nombre_input" className="floating-label-alumno form-label-alumno">
            Nombre completo
          </label>
          {fieldErrors.nombre && (
            <span id="alumno-nombre-error" role="alert" className="error-message-alumno">{fieldErrors.nombre}</span>
          )}
        </div>

        {/* Campo Curso */}
        <div className="form-group-alumno">
          <select
            id="curso_input"
            name="curso"
            aria-invalid={Boolean(fieldErrors.curso || coursesError)}
            aria-describedby={fieldErrors.curso || coursesError ? "alumno-curso-error" : undefined}
            value={formData.curso}
            onChange={handleChange}
            disabled={loadingCourses || Boolean(coursesError)}
            className={`form-input-alumno ${fieldErrors.curso ? 'input-error-alumno' : ''}`}
          >
            <option value="">
              {loadingCourses ? "Cargando cursos..." : coursesError || "Seleccionar curso"}
            </option>
            {courses.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
          <label htmlFor="curso_input" className="floating-label-alumno form-label-alumno">
            Curso
          </label>
          {(fieldErrors.curso || coursesError) && (
            <span id="alumno-curso-error" role="alert" className="error-message-alumno">{fieldErrors.curso || coursesError}</span>
          )}
        </div>

        <div className="form-group-alumno">
          <input
            id="fecha_nacimiento_input"
            name="fechaNacimiento"
            aria-invalid={Boolean(fieldErrors.fechaNacimiento)}
            aria-describedby={fieldErrors.fechaNacimiento ? "alumno-fechaNacimiento-error" : undefined}
            type="date"
            value={formData.fechaNacimiento ?? ""}
            onChange={handleChange}
            className={`form-input-alumno ${fieldErrors.fechaNacimiento ? 'input-error-alumno' : ''}`}
          />
          <label htmlFor="fecha_nacimiento_input" className="floating-label-alumno form-label-alumno">
            Fecha de nacimiento
          </label>
          {fieldErrors.fechaNacimiento && (
            <span id="alumno-fechaNacimiento-error" role="alert" className="error-message-alumno">{fieldErrors.fechaNacimiento}</span>
          )}
        </div>

        <div className="form-group-alumno">
          <select id="genero_input" name="genero" value={formData.genero}
            onChange={handleChange} className="form-input-alumno">
            <option value="MASCULINO">Masculino</option>
            <option value="FEMENINO">Femenino</option>
            <option value="OTROS">Otros</option>
          </select>
          <label htmlFor="genero_input" className="floating-label-alumno form-label-alumno">
            Género
          </label>
        </div>

        <div className="form-group-alumno form-group-alumno--wide">
          <textarea
            id="observacion_input"
            name="observacion"
            aria-invalid={Boolean(fieldErrors.observacion)}
            aria-describedby={fieldErrors.observacion ? "alumno-observacion-error" : undefined}
            value={formData.observacion ?? ""}
            onChange={handleChange}
            placeholder="Ej.: Mati es alérgico al maní"
            maxLength={300}
            className={`form-input-alumno ${fieldErrors.observacion ? 'input-error-alumno' : ''}`}
          />
          <label htmlFor="observacion_input" className="floating-label-alumno form-label-alumno">
            Mensaje / descripción (opcional)
          </label>
          {fieldErrors.observacion && (
            <span id="alumno-observacion-error" role="alert" className="error-message-alumno">{fieldErrors.observacion}</span>
          )}
        </div>

        <div className="form-actions-alumno">
          <Button
            variant="primary"
            size="medium"
            type="submit"
            onClick={() => {}}
            loading={loading}
            label={loading ? "Creando Alumno" : "Crear Alumno"}
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

      {loading && <LoadingState message="Guardando los datos" />}
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
