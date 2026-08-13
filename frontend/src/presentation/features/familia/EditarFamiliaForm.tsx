import { useEditFamilia } from "@/presentation/hooks/familia/useEditFamilia";
import { FAMILIA_ICONS } from "@/shared/constants/Icons";
import { Button } from "@/shared/ui/button/Button";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import "./style/CrearFamilia.css";
import { CompactSelect } from "./CrearFamilia";

const parentescos = ["Padre", "Madre", "Tutor", "Abuelo", "Abuela", "Hermano", "Hermana"];

export const EditarFamiliaForm = () => {
  const {
    formData,
    familiaData,
    loading,
    initialLoading,
    fieldErrors,
    modal,
    handleChange,
    handleApoderadoChange,
    setParentesco,
    addApoderado,
    removeApoderado,
    handleSubmit,
    setModal,
    navigate,
    loadError,
    apoderados,
    loadingApoderados,
    apoderadosError,
  } = useEditFamilia();

  if (initialLoading) {
    return (
      <div className="form-view-container familia-edit" role="status"
        aria-label="Cargando familia">
        <form className="familia-create__form familia-edit__form">
          <div className="familia-edit__summary">
            <div><span>Familia</span><div className="skeleton-block skeleton-input" /></div>
            <div><span>Alumno</span><div className="skeleton-block skeleton-input" /></div>
          </div>
          <section className="familia-form__apoderado familia-edit__apoderado">
            <header className="familia-form__apoderado-header">
              <div><strong>Apoderado 1</strong><span>Principal</span></div>
            </header>
            <div className="familia-edit__guardian-name"><span>Nombre</span>
              <div className="skeleton-block skeleton-input" /></div>
            <label className="familia-field"><span>Parentesco</span>
              <div className="skeleton-block skeleton-input" /></label>
            <div className="familia-check"><label><input type="radio" disabled />
              <span>Apoderado principal</span></label></div>
          </section>
          <details className="familia-observaciones">
            <summary>Observaciones <span>(opcional)</span></summary>
          </details>
          <div className="familia-actions">
            <Button variant="primary" size="medium" disabled onClick={() => undefined}
              label="Actualizar" icon={<FAMILIA_ICONS.save />} />
            <Button variant="secondary" size="medium" onClick={() => navigate("/family")}
              label="Cancelar" icon={<FAMILIA_ICONS.cancel />} />
          </div>
        </form>
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
    <div className="form-view-container familia-edit">
      <form className="familia-create__form familia-edit__form">
        <div className="familia-edit__summary">
          <div>
            <span>Familia</span>
            <strong>{familiaData?.codigoFamilia}</strong>
          </div>
          <div>
            <span>Alumno</span>
            <strong>
              {familiaData?.alumno.nombre} ({familiaData?.alumno.codigo})
            </strong>
          </div>
        </div>

        {(formData.apoderados ?? []).map((relacion, index) => {
          const apoderado = apoderados.find(
            (item) => item.apoderadoId === relacion.apoderadoId,
          ) ?? familiaData?.apoderados.find(
            (item) => (item.apoderadoId ?? item.id) === relacion.apoderadoId,
          );
          const apoderadoIdError =
            fieldErrors[`apoderados[${index}].apoderadoId`] ??
            fieldErrors[`apoderados.${index}.apoderadoId`];
          const parentescoError =
            fieldErrors[`apoderados[${index}].parentesco`] ??
            fieldErrors[`apoderados.${index}.parentesco`] ??
            fieldErrors.parentesco;

          return (
          <section className="familia-form__apoderado familia-edit__apoderado" key={`${relacion.apoderadoId}-${index}`}>
            <header className="familia-form__apoderado-header">
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
            </header>
            <label className="familia-field">
              <span>Seleccionar apoderado</span>
              <select id={`apoderado_input_${index}`} name="apoderadoId"
                aria-label={`Seleccionar apoderado ${index + 1}`}
                value={relacion.apoderadoId || ""}
                onChange={(event) => handleApoderadoChange(index, event)}
                disabled={loadingApoderados || Boolean(apoderadosError)}
                className={apoderadoIdError ? "input-error" : ""}>
                <option value="">
                  {loadingApoderados ? "Cargando apoderados..." : "Seleccionar apoderado"}
                </option>
                {apoderado && !apoderados.some(item => item.apoderadoId === relacion.apoderadoId) &&
                  <option value={relacion.apoderadoId}>
                    {[apoderado.codigo, apoderado.nombre].filter(Boolean).join(" - ")}
                  </option>}
                {apoderados.filter((item) => !(formData.apoderados ?? []).some(
                  (seleccionado, currentIndex) => currentIndex !== index &&
                    seleccionado.apoderadoId === item.apoderadoId,
                )).map((item) => <option key={item.apoderadoId} value={item.apoderadoId}>
                  {[item.codigo, item.nombre].filter(Boolean).join(" - ")}
                </option>)}
              </select>
              {(apoderadoIdError || apoderadosError) &&
                <small>{apoderadoIdError || apoderadosError}</small>}
            </label>

            <label className="familia-field">
              <span>Parentesco</span>
              <CompactSelect
                label={`Parentesco del apoderado ${index + 1}`}
                value={relacion.parentesco}
                placeholder="Seleccionar parentesco"
                error={Boolean(parentescoError)}
                options={parentescos.map((parentesco) => ({ value: parentesco, label: parentesco }))}
                onChange={(value) => setParentesco(index, value)}
              />
              {parentescoError && <small>{parentescoError}</small>}
            </label>

            <div className="familia-check">
              <label>
                <input
                  type="radio"
                  name="esPrincipal"
                  checked={relacion.esPrincipal}
                  onChange={(event) => handleApoderadoChange(index, event)}
                />
                <span>Apoderado principal</span>
              </label>
            </div>
          </section>
          );
        })}

        {(formData.apoderados ?? []).length < 2 && (
          <div className="familia-form__add-apoderado">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={addApoderado}
              label="Agregar segundo apoderado"
              icon={<FAMILIA_ICONS.crearFamilia />}
            />
          </div>
        )}

        <details className="familia-observaciones" open={Boolean(formData.observacionesGenerales)}>
          <summary>Observaciones <span>(opcional)</span></summary>
          <label className="familia-field familia-observaciones__content">
            <span>Observaciones generales</span>
            <textarea
              id="observaciones_input"
              name="observacionesGenerales"
              value={formData.observacionesGenerales || ""}
              onChange={handleChange}
              placeholder="Observaciones adicionales..."
              rows={3}
              className={fieldErrors.observacionesGenerales ? "input-error" : ""}
            />
            {fieldErrors.observacionesGenerales && <small>{fieldErrors.observacionesGenerales}</small>}
          </label>
        </details>

        <div className="familia-actions">
          <Button
            variant="primary"
            size="medium"
            onClick={handleSubmit}
            loading={loading}
            label={loading ? "Actualizando..." : "Actualizar"}
            icon={<FAMILIA_ICONS.save style={{ margin: "3px" }} />}
          />

          <Button
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
        onClose={() => setModal({ ...modal, isOpen: false })}
        autoCloseTime={2000}
        variant={modal.type === "success" ? "toast" : "modal"}
      />
    </div>
  );
};
