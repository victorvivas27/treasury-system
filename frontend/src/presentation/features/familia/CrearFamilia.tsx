import { useCreateFamilia } from "@/presentation/hooks/familia/useCreateFamilia";

import { FAMILIA_ICONS } from "@/shared/constants/Icons";

import "./style/CrearFamilia.css";

import { Button } from "@/shared/ui/button/Button";

import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { useState } from "react";

const parentescos = [
  "Padre",
  "Madre",
  "Tutor",
  "Abuelo",
  "Abuela",
  "Hermano",
  "Hermana",
];

interface CompactSelectProps {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  error?: boolean;
  onChange: (value: string) => void;
}

export const CompactSelect = ({
  label,
  value,
  placeholder,
  options,
  disabled = false,
  error = false,
  onChange,
}: CompactSelectProps) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <div className="familia-parentesco">
      <button
        type="button"
        className={`familia-parentesco__trigger ${error ? "input-error" : ""}`}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {selectedLabel || placeholder}
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="familia-parentesco__menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const CrearFamilia = () => {
  const {
    formData,
    loading,
    fieldErrors,
    modal,
    handleHeaderChange,
    handleApoderadoChange,
    setAlumnoId,
    setApoderadoId,
    setParentesco,
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

          <CompactSelect
            label="Alumno"
            value={String(formData.alumnoId || "")}
            placeholder={loadingAlumnos ? "Cargando alumnos..." : "Seleccionar alumno"}
            disabled={loadingAlumnos || Boolean(alumnosError)}
            error={Boolean(fieldErrors.alumnoId)}
            options={alumnos.map((alumno) => ({
              value: String(alumno.alumnoId),
              label: [alumno.codigo, alumno.nombre, alumno.curso].filter(Boolean).join(" - "),
            }))}
            onChange={(value) => setAlumnoId(Number(value))}
          />

          {(fieldErrors.alumnoId || alumnosError) && (
            <small>{fieldErrors.alumnoId || alumnosError}</small>
          )}
        </label>

        {(formData.apoderados ?? []).map((relacion, index) => (
          <div className="familia-form__apoderado" key={index}>
            <div className="familia-form__apoderado-header">
              <div>
                <strong>Apoderado {index + 1}</strong>
                <span>{relacion.esPrincipal ? "Principal" : "Adicional"}</span>
              </div>

              {(formData.apoderados ?? []).length > 1 && (
                <Button
                  type="button"
                  variant="danger"
                  size="small"
                  onClick={() => removeApoderado(index)}
                  label="Quitar"
                  icon={<FAMILIA_ICONS.delete />}
                />
              )}
            </div>

            <label className="familia-field">
              <span>Apoderado {index + 1}</span>
              <CompactSelect
                label={`Seleccionar apoderado ${index + 1}`}
                value={String(relacion.apoderadoId || "")}
                placeholder={loadingApoderados ? "Cargando apoderados..." : "Seleccionar apoderado"}
                disabled={loadingApoderados || Boolean(apoderadosError)}
                error={Boolean(fieldErrors[`apoderados.${index}.apoderadoId`])}
                options={apoderados.map((apoderado) => ({
                  value: String(apoderado.apoderadoId),
                  label: [apoderado.codigo, apoderado.nombre].filter(Boolean).join(" - "),
                }))}
                onChange={(value) => setApoderadoId(index, Number(value))}
              />

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
              <CompactSelect
                label={`Parentesco del apoderado ${index + 1}`}
                value={relacion.parentesco}
                placeholder="Seleccionar parentesco"
                error={Boolean(fieldErrors[`apoderados.${index}.parentesco`])}
                options={parentescos.map((parentesco) => ({ value: parentesco, label: parentesco }))}
                onChange={(value) => setParentesco(index, value)}
              />

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

        <p
          className={`familia-message familia-message--validation ${
            fieldErrors.apoderados ? "familia-message--error" : "is-empty"
          }`}
          aria-live="polite"
        >
          {fieldErrors.apoderados || "\u00A0"}
        </p>
        <div className="familia-form__add-apoderado">
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={addApoderado}
            label="Agregar otro apoderado"
            icon={<FAMILIA_ICONS.crearFamilia />}
          />
        </div>

        <details className="familia-observaciones">
          <summary>Observaciones <span>(opcional)</span></summary>
          <label className="familia-field familia-observaciones__content">
            <span>Observaciones generales</span>
            <textarea
              name="observacionesGenerales"
              value={formData.observacionesGenerales ?? ""}
              onChange={handleHeaderChange}
              rows={3}
              placeholder="Agrega información relevante sobre la familia"
            />
          </label>
        </details>

        <div className="familia-actions">
          <Button
            variant="primary"
            size="medium"
            type="submit"
            loading={loading}
            disabled={loading || loadingAlumnos || loadingApoderados}
            label={loading ? "Creando..." : "Crear familia"}
            icon={<FAMILIA_ICONS.addCircle />}
            onClick={() => { }}

          />

          <Button
            type="button"
            variant="secondary"
            size="medium"
            onClick={() => navigate("/family")}
            label="Cancelar"
            icon={<FAMILIA_ICONS.cancel />}
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
