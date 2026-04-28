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
    setModal
  } = useCreateApoderado();

  return (
    <div className="form-view-container">
      <form className="form-card">


        {/* Campo Nombre */}
        <div className="form-group floating-group">
          <input
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Juan Carlos Perez Example"
            className={`form-input ${fieldErrors.nombre ? 'input-error' : ''}`}
          />
          <label className="floating-label">Nombre completo </label>
          {fieldErrors.nombre && <span className="error-message">{fieldErrors.nombre}</span>}
        </div>


        {/* Campo Email */}
        <div className="form-group floating-group">
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="ejemplo@email.com" /* El ejemplo va aquí */
            className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
          />
          <label className="floating-label">Email </label>
          {fieldErrors.email && <span className="error-message">{fieldErrors.email}</span>}
        </div>


        {/* Campo Teléfono */}
        <div className="form-group floating-group">

          <input
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            placeholder="+56 9 888 88 88 "
            className={`form-input ${fieldErrors.telefono ? 'input-error' : ''}`}
          />
          <label className="floating-label">Teléfono</label>
          {fieldErrors.telefono && <span className="error-message">{fieldErrors.telefono}</span>}
        </div>

        <div className="form-group col-span-3">
          <label className="form-label">Observaciones</label>
          <textarea
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            className="form-input form-textarea"
          />
        </div>
      </form>

      <Button
        type="button"
        disabled={loading}
        loading={loading}
        icon={<APODERADOS_ICONS.reload />}
        label={loading ? "Creando Apoderado" : "Crear Apoderado"}
        onClick={handleActionSubmit}
        variant="primary"
      />

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
      />

      {/* <Button
  label="Probar Modal"
  onClick={() => showAlert("¡Esto es una prueba sin backend!", "success")}
  variant="secondary"
/> */}

    </div>
  );
};
