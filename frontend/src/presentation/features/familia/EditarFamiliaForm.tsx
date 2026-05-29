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
        {/* Información de la relación (solo lectura) */}
        <div className="info-section">
          <h3>Información de la relación</h3>
          <div className="info-row">
            <span className="info-label">Apoderado:</span>
            <span className="info-value">
              {familiaData?.nombre} ({familiaData?.codigo})
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{familiaData?.email || "No registrado"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Teléfono:</span>
            <span className="info-value">{familiaData?.telefono || "No registrado"}</span>
          </div>
        </div>

        <div className="form-group floating-group">
          <select
            id="parentesco_input"
            name="parentesco"
            value={formData.parentesco}
            onChange={handleChange}
            className={`form-input ${fieldErrors.parentesco ? 'input-error' : ''}`}
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
          <label htmlFor="parentesco_input" className="floating-label form-label">Parentesco</label>
          {fieldErrors.parentesco && <span className="error-message">{fieldErrors.parentesco}</span>}
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="principal"
              checked={formData.principal}
              onChange={handleChange}
            />
            <span>Apoderado principal</span>
          </label>
          {fieldErrors.principal && <span className="error-message">{fieldErrors.principal}</span>}
        </div>

        <div className="form-group floating-group">
          <textarea
            id="observaciones_input"
            name="observaciones"
            value={formData.observaciones || ""}
            onChange={handleChange}
            placeholder="Observaciones adicionales..."
            rows={3}
            className={`form-input ${fieldErrors.observaciones ? 'input-error' : ''}`}
          />
          <label htmlFor="observaciones_input" className="floating-label form-label">Observaciones (opcional)</label>
          {fieldErrors.observaciones && <span className="error-message">{fieldErrors.observaciones}</span>}
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
