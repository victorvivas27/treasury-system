// components/apoderado/CrearApoderadoForm.tsx
import { Button } from "@/shared/ui/button/Button";
import "./style/CrearApoderadoForm.css";
import { useCreateApoderado } from "@/presentation/hooks/apoderado/useCreateApoderado";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { APODERADOS_ICONS } from "@/shared/constants/Icons";
import { useState, type ChangeEvent } from "react";

const LATAM_COUNTRIES = [
  { code: "CL", flag: "🇨🇱", name: "Chile", dialCode: "+56", phoneLength: 9 },
  { code: "AR", flag: "🇦🇷", name: "Argentina", dialCode: "+54", phoneLength: 10 },
  { code: "BO", flag: "🇧🇴", name: "Bolivia", dialCode: "+591", phoneLength: 8 },
  { code: "BR", flag: "🇧🇷", name: "Brasil", dialCode: "+55", phoneLength: 11 },
  { code: "CO", flag: "🇨🇴", name: "Colombia", dialCode: "+57", phoneLength: 10 },
  { code: "CR", flag: "🇨🇷", name: "Costa Rica", dialCode: "+506", phoneLength: 8 },
  { code: "CU", flag: "🇨🇺", name: "Cuba", dialCode: "+53", phoneLength: 8 },
  { code: "EC", flag: "🇪🇨", name: "Ecuador", dialCode: "+593", phoneLength: 9 },
  { code: "SV", flag: "🇸🇻", name: "El Salvador", dialCode: "+503", phoneLength: 8 },
  { code: "GT", flag: "🇬🇹", name: "Guatemala", dialCode: "+502", phoneLength: 8 },
  { code: "HT", flag: "🇭🇹", name: "Haití", dialCode: "+509", phoneLength: 8 },
  { code: "HN", flag: "🇭🇳", name: "Honduras", dialCode: "+504", phoneLength: 8 },
  { code: "MX", flag: "🇲🇽", name: "México", dialCode: "+52", phoneLength: 10 },
  { code: "NI", flag: "🇳🇮", name: "Nicaragua", dialCode: "+505", phoneLength: 8 },
  { code: "PA", flag: "🇵🇦", name: "Panamá", dialCode: "+507", phoneLength: 8 },
  { code: "PY", flag: "🇵🇾", name: "Paraguay", dialCode: "+595", phoneLength: 9 },
  { code: "PE", flag: "🇵🇪", name: "Perú", dialCode: "+51", phoneLength: 9 },
  { code: "DO", flag: "🇩🇴", name: "República Dominicana", dialCode: "+1", phoneLength: 10 },
  { code: "UY", flag: "🇺🇾", name: "Uruguay", dialCode: "+598", phoneLength: 8 },
  { code: "VE", flag: "🇻🇪", name: "Venezuela", dialCode: "+58", phoneLength: 10 },
] as const;

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
  const [countryCode, setCountryCode] = useState("CL");
  const selectedCountry = LATAM_COUNTRIES.find((country) => country.code === countryCode) ?? LATAM_COUNTRIES[0];
  const localPhone = formData.telefono.startsWith(selectedCountry.dialCode)
    ? formData.telefono.slice(selectedCountry.dialCode.length)
    : formData.telefono.replace(/^\+/, "");

  const updatePhone = (dialCode: string, value: string) => {
    const digits = value.replace(/\D/g, "");
    handleChange({
      target: { name: "telefono", value: digits ? `${dialCode}${digits}` : "" },
    } as ChangeEvent<HTMLInputElement>);
  };

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
          <label htmlFor="telefono_input" className="form-label-apoderado telefono-label-apoderado">
            Teléfono
          </label>
          <div className={`telefono-control-apoderado ${fieldErrors.telefono ? "input-error-apoderado input-error" : ""}`}>
            <select
              className="telefono-country-apoderado"
              value={countryCode}
              aria-label="País y prefijo telefónico"
              onChange={(event) => {
                const nextCountry = LATAM_COUNTRIES.find((country) => country.code === event.target.value) ?? LATAM_COUNTRIES[0];
                setCountryCode(nextCountry.code);
                updatePhone(nextCountry.dialCode, localPhone);
              }}
            >
              {LATAM_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name} {country.dialCode}
                </option>
              ))}
            </select>
            <span className="telefono-prefix-apoderado" aria-hidden="true">{selectedCountry.dialCode}</span>
            <div className="telefono-number-wrap-apoderado">
              <input
                id="telefono_input"
                name="telefono"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={selectedCountry.phoneLength}
                aria-describedby={fieldErrors.telefono ? "telefono_error" : undefined}
                aria-invalid={Boolean(fieldErrors.telefono)}
                aria-label="Número de teléfono"
                value={localPhone}
                onChange={(event) => updatePhone(selectedCountry.dialCode, event.target.value)}
                placeholder=" "
                className={`telefono-number-apoderado ${fieldErrors.telefono ? "input-error-apoderado input-error" : ""}`}
              />
              <span className="telefono-mask-apoderado" aria-hidden="true">
                <span>{localPhone}</span>{"_".repeat(Math.max(0, selectedCountry.phoneLength - localPhone.length))}
              </span>
            </div>
          </div>
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
