import { useEditFamilia } from "@/presentation/hooks/familia/useEditFamilia";
import { FAMILIA_ICONS } from "@/shared/constants/Icons";
import { Button } from "@/shared/ui/button/Button";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";

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
    handleSubmit,
    setModal,
    navigate,
    loadError,
  } = useEditFamilia();

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
        <div className="info-section">
          <h3>Informacion de la familia</h3>
          <div className="info-row">
            <span className="info-label">Familia:</span>
            <span className="info-value">{familiaData?.codigoFamilia}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Alumno:</span>
            <span className="info-value">
              {familiaData?.alumno.nombre} ({familiaData?.alumno.codigo})
            </span>
          </div>
        </div>

        {(formData.apoderados ?? []).map((relacion, index) => {
          const apoderado = familiaData?.apoderados[index];
          const parentescoError =
            fieldErrors[`apoderados[${index}].parentesco`] ??
            fieldErrors[`apoderados.${index}.parentesco`] ??
            fieldErrors.parentesco;

          return (
          <section className="info-section" key={relacion.apoderadoId}>
            <h3>Apoderado {index + 1}</h3>
            <div className="info-row">
              <span className="info-label">Nombre:</span>
              <span className="info-value">
                {apoderado
                  ? `${apoderado.nombre} (${apoderado.codigo})`
                  : `ID ${relacion.apoderadoId}`}
              </span>
            </div>

            <div className="form-group floating-group">
              <select
                id={`parentesco_input_${index}`}
                name="parentesco"
                value={relacion.parentesco}
                onChange={(event) => handleApoderadoChange(index, event)}
                className={`form-input ${parentescoError ? "input-error" : ""}`}
              >
                <option value="">Seleccionar parentesco</option>
                <option value="Padre">Padre</option>
                <option value="Madre">Madre</option>
                <option value="Tutor">Tutor</option>
                <option value="Abuelo">Abuelo</option>
                <option value="Abuela">Abuela</option>
                <option value="Hermano">Hermano</option>
                <option value="Hermana">Hermana</option>
              </select>
              <label htmlFor={`parentesco_input_${index}`} className="floating-label form-label">
                Parentesco
              </label>
              {parentescoError && <span className="error-message">{parentescoError}</span>}
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="esPrincipal"
                  checked={relacion.esPrincipal}
                  onChange={(event) => handleApoderadoChange(index, event)}
                />
                <span>Seleccionar como apoderado principal</span>
              </label>
            </div>
          </section>
          );
        })}

        <div className="form-group floating-group">
          <textarea
            id="observaciones_input"
            name="observacionesGenerales"
            value={formData.observacionesGenerales || ""}
            onChange={handleChange}
            placeholder="Observaciones adicionales..."
            rows={3}
            className={`form-input ${fieldErrors.observacionesGenerales ? "input-error" : ""}`}
          />
          <label htmlFor="observaciones_input" className="floating-label form-label">Observaciones (opcional)</label>
          {fieldErrors.observacionesGenerales && (
            <span className="error-message">{fieldErrors.observacionesGenerales}</span>
          )}
        </div>

        <div className="form-actions">
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
