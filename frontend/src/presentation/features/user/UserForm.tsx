import { useState, type ChangeEvent, type FormEvent } from "react";
import type { UserPayload, UserRole } from "@/core/A-domain/entities/user/User";
import { Button } from "@/shared/ui/button/Button";
import { RxEyeClosed } from "react-icons/rx";
import { TfiEye } from "react-icons/tfi";
import { FiSave, FiX } from "react-icons/fi";
import "@/presentation/pages/auth/PasswordVisibility.css";

interface UserFormProps {
  initialData?: Partial<UserPayload>;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (payload: UserPayload) => Promise<void> | void;
  onCancel?: () => void;
  showRole?: boolean;
  showAccountStatus?: boolean;
}

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]{3,100}$/;

export const UserForm = ({
  initialData,
  loading = false,
  submitLabel = "Guardar usuario",
  onSubmit,
  onCancel,
  showRole = true,
  showAccountStatus = true,
}: UserFormProps) => {
  const [formData, setFormData] = useState<UserPayload>({
    nombre: initialData?.nombre ?? "",
    correo: initialData?.correo ?? "",
    password: "",
    rol: initialData?.rol ?? "USER",
    enabled: initialData?.enabled ?? true,
    accountNonLocked: initialData?.accountNonLocked ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!NAME_PATTERN.test(formData.nombre.trim())) {
      next.nombre = "Ingrese entre 3 y 100 letras y espacios";
    }
    if (!EMAIL_PATTERN.test(formData.correo)) {
      next.correo = "Ingrese un correo válido";
    }
    if (!initialData && !PASSWORD_PATTERN.test(formData.password ?? "")) {
      next.password = "Use 8 caracteres, mayúscula, minúscula, número y especial";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    if (initialData) {
      const { password: _password, ...updatePayload } = formData;
      await onSubmit(updatePayload);
      return;
    }
    await onSubmit(formData);
  };

  return (
    <form
      className={`form-card user-form ${initialData ? "user-form--edit" : ""}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="form-group">
        <span className="login-input-wrapper login-floating-field">
          <input id="user-form-nombre"
            className={`form-input ${errors.nombre ? "input-error" : ""}`}
            name="nombre" placeholder="Ej.: Ana Pérez" autoComplete="name"
            value={formData.nombre} onChange={handleChange} />
          <label htmlFor="user-form-nombre" className="login-floating-label">Nombre</label>
        </span>
        {errors.nombre && <span className="error-message">{errors.nombre}</span>}
      </div>

      <div className="form-group">
        <span className="login-input-wrapper login-floating-field">
          <input id="user-form-correo"
            className={`form-input ${errors.correo ? "input-error" : ""}`}
            name="correo" type="email" placeholder="Ej.: nombre@correo.cl"
            autoComplete="email" value={formData.correo} onChange={handleChange} />
          <label htmlFor="user-form-correo" className="login-floating-label">Correo</label>
        </span>
        {errors.correo && <span className="error-message">{errors.correo}</span>}
      </div>

      {!initialData && <div className="form-group user-form__password-group">
        <span className="password-input-wrapper login-floating-field">
          <input
            id="user-form-password"
            className={`form-input password-input ${errors.password ? "input-error" : ""}`}
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Ej.: ClaveSegura1!"
            autoComplete="new-password"
            value={formData.password ?? ""}
            onChange={handleChange}
          />
          <label htmlFor="user-form-password" className="login-floating-label">Contraseña</label>
          <button
            className="password-visibility-button"
            type="button"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <TfiEye aria-hidden="true" /> : <RxEyeClosed aria-hidden="true" />}
          </button>
        </span>
        {errors.password && <span className="error-message">{errors.password}</span>}
      </div>}

      {showRole && (
        <label className="form-group">
          <span className="form-label">Rol</span>
          <select
            className="form-input"
            name="rol"
            value={formData.rol}
            onChange={handleChange}
          >
            {(["USER", "ADMIN"] as UserRole[]).map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>
      )}

      {showAccountStatus && (
        <div className="user-form__account-status">
          <label className="checkbox-label">
            <input
              name="enabled"
              type="checkbox"
              checked={formData.enabled}
              onChange={handleChange}
            />
            Usuario activo
          </label>

          <label className="checkbox-label">
            <input
              name="accountNonLocked"
              type="checkbox"
              checked={formData.accountNonLocked}
              onChange={handleChange}
            />
            Cuenta desbloqueada
          </label>
        </div>
      )}

      <div className="form-actions">
        <Button
          type="submit"
          className="user-form__submit-button"
          onClick={() => {}}
          loading={loading}
          label={loading ? "Guardando..." : submitLabel}
          icon={<FiSave aria-hidden="true" />}
          size="medium"
        />
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            label="Cancelar"
            icon={<FiX aria-hidden="true" />}
            size="medium"
          />
        )}
      </div>
    </form>
  );
};
