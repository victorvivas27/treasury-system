// components/apoderado/CrearApoderadoForm.tsx
import { Button } from "@/shared/ui/button/Button";
import "./style/CrearApoderadoForm.css";
import { useCreateApoderado } from "@/presentation/hooks/apoderado/useCreateApoderado";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { APODERADOS_ICONS } from "@/shared/constants/Icons";


export const CrearApoderadoForm = () => {
  const {
    formData,
    loading,
    fieldErrors,
    modal,
    handleChange,
    handleActionSubmit,
    navigate,
    setModal,
  } = useCreateApoderado();

  return (
    <main>
      <form className="form-card-apoderado">
        {/* Campo Nombre */}
        <div className="form-group-apoderado">
          <input
            id="nombre_input"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Juan Carlos Perez Example"
            className={`form-input-apoderado ${fieldErrors.nombre ?
              'input-error-apoderado input-error' : ''}`}
          />
          <label htmlFor="nombre_input" className="floating-label-apoderado form-label-apoderado">
            Nombre completo
          </label>
          {fieldErrors.nombre && (
            <span className="error-message-apoderado">{fieldErrors.nombre}</span>
          )}
        </div>

        {/* Campo Email */}
        <div className="form-group-apoderado">
          <input
            id="email_input"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="ejemplo@email.com"
            className={`form-input-apoderado ${fieldErrors.email ?
              'input-error-apoderado input-error' : ''}`}
          />
          <label htmlFor="email_input" className="floating-label-apoderado">
            Email
          </label>
          {fieldErrors.email && (
            <span className="error-message-apoderado">{fieldErrors.email}</span>
          )}
        </div>

        {/* Campo Teléfono */}
        <div className="form-group-apoderado">
          <input
            id="telefono_input"
            name="telefono"
            type="tel"
            inputMode="tel"
            aria-describedby={fieldErrors.telefono ? "telefono_error" : undefined}
            aria-invalid={Boolean(fieldErrors.telefono)}
            value={formData.telefono}
            onChange={handleChange}
            placeholder="+56 9 888 88 88"
            className={`form-input-apoderado ${fieldErrors.telefono ?
              'input-error-apoderado input-error' : ''}`}
          />
          <label htmlFor="telefono_input" className="floating-label-apoderado form-label-apoderado">
            Teléfono
          </label>
          {fieldErrors.telefono && (
            <span id="telefono_error" className="error-message-apoderado" role="alert">
              {fieldErrors.telefono}
            </span>
          )}
        </div>

        {/* Campo Observaciones */}
        <div className="form-group-apoderado">
          <label htmlFor="observaciones_input" className="form-label-apoderado">
            Observaciones
          </label>
          <textarea
            id="observaciones_input"
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            className="form-input-apoderado"
            placeholder="escribe aquí"
          />
        </div>

        {/* Acciones */}
        <div className="form-actions-apoderado">
          <Button
            variant="primary"
            size="medium"
            className="form-actions-apoderado__create-button"
            onClick={handleActionSubmit}
            loading={loading}
            label={loading ? "Creando Apoderado" : "Crear Apoderado"}
            icon={<APODERADOS_ICONS.addCircle />}
          />

          <Button
            variant="danger"
            size="medium"
            onClick={() => navigate("/parents")}
            label="Cancelar"
            icon={<APODERADOS_ICONS.cancel />}
          />
        </div>
      </form>

      <ModalAlert
        isOpen={modal.isOpen}
        message={modal.message}
        type={modal.type}
        onClose={() => {
          setModal(prev => ({ ...prev, isOpen: false }));
          if (modal.type === "success") {
            navigate("/parents");
          }
        }}
        autoCloseTime={2000}
        variant={modal.type === "success" ? "toast" : "modal"}
      />
    </main>
  );
};
