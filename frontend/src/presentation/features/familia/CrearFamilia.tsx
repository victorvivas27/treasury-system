import { useCreateFamilia } from "@/presentation/hooks/familia/useCreateFamilia";

import { FAMILIA_ICONS } from "@/shared/constants/Icons";

import "./style/CrearFamilia.css";

import { Button } from "@/shared/ui/button/Button";

import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";

const parentescos = [
  "Padre",
  "Madre",
  "Tutor",
  "Abuelo",
  "Abuela",
  "Hermano",
  "Hermana",
];

export const CrearFamilia = () => {
  const {
    formData,
    loading,
    fieldErrors,
    modal,
    handleHeaderChange,
    handleApoderadoChange,
    addApoderado,
    removeApoderado,
    handleActionSubmit,
    closeModal,
    navigate,
    alumnos,
    loadingAlumnos,
    alumnosError,
    apoderados,
    loadingApoderados,
    apoderadosError,
  } = useCreateFamilia();



  return (
    <main className="familia-create">

      <form className="familia-create__form" onSubmit={(e) => {
        e.preventDefault();
        handleActionSubmit();
      }}>


        <label className="familia-field">
          <span>Alumno</span>

          <select
            name="alumnoId"
            value={formData.alumnoId ?? ""}
            onChange={handleHeaderChange}
            disabled={loadingAlumnos || Boolean(alumnosError)}
            className={fieldErrors.alumnoId ? "input-error" : ""}
          >
            <option value="">
              {loadingAlumnos ? "Cargando alumnos..." : "Seleccionar alumno"}
            </option>

            {alumnos.map((alumno) => (
              <option key={alumno.alumnoId} value={alumno.alumnoId}>
                {[alumno.codigo, alumno.nombre, alumno.curso]
                  .filter(Boolean)
                  .join(" - ")}
              </option>
            ))}
          </select>

          {(fieldErrors.alumnoId || alumnosError) && (
            <small>{fieldErrors.alumnoId || alumnosError}</small>
          )}
        </label>

        {(formData.apoderados ?? []).map((relacion, index) => (
          <div className="familia-form__apoderado" key={index}>
            <div className="familia-form__apoderado-header">

              {(formData.apoderados ?? []).length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => removeApoderado(index)}
                  label="Quitar"
                />
              )}
            </div>

            <label className="familia-field">
              <span>Apoderado</span>

              <select
                name="apoderadoId"
                value={relacion.apoderadoId || ""}
                onChange={(event) => handleApoderadoChange(index, event)}
                disabled={loadingApoderados || Boolean(apoderadosError)}
                className={
                  fieldErrors[`apoderados.${index}.apoderadoId`]
                    ? "input-error"
                    : ""
                }
              >
                <option value="">
                  {loadingApoderados
                    ? "Cargando apoderados..."
                    : "Seleccionar apoderado"}
                </option>

                {apoderados.map((apoderado) => (
                  <option key={apoderado.apoderadoId} value={apoderado.apoderadoId}>
                    {[apoderado.codigo, apoderado.nombre]
                      .filter(Boolean)
                      .join(" - ")}
                  </option>
                ))}
              </select>

              {(fieldErrors[`apoderados.${index}.apoderadoId`] ||
                apoderadosError) && (
                  <small>
                    {fieldErrors[`apoderados.${index}.apoderadoId`] ||
                      apoderadosError}
                  </small>
                )}
            </label>

            <label className="familia-field">
              <span>Parentesco</span>

              <select
                name="parentesco"
                value={relacion.parentesco}
                onChange={(event) => handleApoderadoChange(index, event)}
                className={
                  fieldErrors[`apoderados.${index}.parentesco`]
                    ? "input-error"
                    : ""
                }
              >
                <option value="">Seleccionar parentesco</option>

                {parentescos.map((parentesco) => (
                  <option key={parentesco} value={parentesco}>
                    {parentesco}
                  </option>
                ))}
              </select>

              {fieldErrors[`apoderados.${index}.parentesco`] && (
                <small>{fieldErrors[`apoderados.${index}.parentesco`]}</small>
              )}
            </label>

            <label className="familia-check">
              <input
                name="esPrincipal"
                type="checkbox"
                checked={relacion.esPrincipal}
                onChange={(event) => handleApoderadoChange(index, event)}
              />

              <span>Apoderado principal</span>
            </label>
          </div>
        ))}

        {fieldErrors.apoderados && (
          <p className="familia-message familia-message--error">
            {fieldErrors.apoderados}
          </p>
        )}
<div className="familia-form__add-apoderado">
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={addApoderado}
          label="Agregar apoderado"
          icon={<FAMILIA_ICONS.crearFamilia />}
        />
        </div>

        <label className="familia-field">
          <span>Observaciones</span>

          <textarea
            name="observacionesGenerales"
            value={formData.observacionesGenerales ?? ""}
            onChange={handleHeaderChange}
            rows={4}
          />
        </label>

        <div className="familia-actions">
          <Button
            variant="primary"
            size="medium"
            type="submit"
            loading={loading}
            disabled={loading || loadingAlumnos || loadingApoderados}
            label={loading ? "Creando..." : "Crear familia"}
            icon={<FAMILIA_ICONS.save />}
            onClick={() => { }}

          />

          <Button
            type="button"
            variant="secondary"
            size="medium"
            onClick={() => navigate("/family")}
            label="Cancelar"
          />
        </div>
      </form>

      <ModalAlert
        isOpen={modal.isOpen}
        message={modal.message}
        type={modal.type}
        onClose={closeModal}
        autoCloseTime={2500}
      />
    </main>
  );
};
