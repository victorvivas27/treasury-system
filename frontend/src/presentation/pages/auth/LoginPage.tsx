import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { Button } from "@/shared/ui/button/Button";
import { ButtonBack } from "@/shared/ui/buttonback/ButtonBack";
import { RxEyeClosed } from "react-icons/rx";
import { TfiEye } from "react-icons/tfi";
import axios from "axios";
import "./PasswordVisibility.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const loginErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) {
    return "Correo o contraseña inválidos";
  }

  const errors = error.response.data?.errors;
  if (errors && typeof errors === "object") {
    const message = Object.values(errors).find((value) => typeof value === "string");
    if (typeof message === "string") return message;
  }

  return "Demasiados intentos fallidos. Espera un minuto antes de volver a intentarlo.";
};

export const LoginPage = () => {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const validationErrors: Record<string, string> = {};
    if (!EMAIL_PATTERN.test(correo.trim())) {
      validationErrors.correo = "Ingrese un correo válido";
    }
    if (!PASSWORD_PATTERN.test(password)) {
      validationErrors.password = "Use 8 caracteres, mayúscula, minúscula, número y especial";
    }
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await login(correo.trim(), password);
      const requestedDestination = (location.state as { from?: string } | null)?.from;
      const destination = requestedDestination && requestedDestination !== "/login"
        ? requestedDestination
        : "/dashboard";
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginErrorMessage(loginError));
    }
  };

  return (
    <main className="form-page-container">
      <header className="form-page-header">
        <img
          className="login-brand-logo"
          src="/Tesoreria.png"
          alt="Logo del Sistema de Tesorería"
        />
        <h1 className="form-page-header__title">Iniciar sesión</h1>
        <p className="form-page-header__subtitle">Accede al Sistema de Tesorería</p>
      </header>
      <form className="form-card login-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <span className="login-input-wrapper login-floating-field">
            <input
              id="login-correo"
              className={`form-input ${fieldErrors.correo ? "input-error" : ""}`}
              type="email"
              placeholder="Ej.: nombre@correo.cl"
              autoComplete="email"
              value={correo}
              onChange={(event) => {
                setCorreo(event.target.value);
                setFieldErrors((current) => ({ ...current, correo: "" }));
              }}
              aria-invalid={Boolean(fieldErrors.correo)}
              aria-describedby={fieldErrors.correo ? "login-correo-error" : undefined}
              required
            />
            <label htmlFor="login-correo" className="login-floating-label">Correo</label>
          </span>
          {fieldErrors.correo && (
            <span id="login-correo-error" className="error-message">{fieldErrors.correo}</span>
          )}
        </div>
        <div className="form-group">
          <span className="password-input-wrapper login-floating-field">
            <input
              id="login-password"
              className="form-input password-input"
              type={showPassword ? "text" : "password"}
              placeholder="Ej.: ClaveSegura1!"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((current) => ({ ...current, password: "" }));
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              required
            />
            <label htmlFor="login-password" className="login-floating-label">Contraseña</label>
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
          {fieldErrors.password && (
            <span id="login-password-error" className="error-message">{fieldErrors.password}</span>
          )}
        </div>
        <p
          className={`form-submit-message ${error ? "is-visible" : ""}`}
          role={error ? "alert" : undefined}
          aria-live="polite"
        >
          {error || "\u00A0"}
        </p>
        <div className="login-form-actions">
          <Button
            type="submit"
            onClick={() => {}}
            loading={loading}
            label={loading ? "Ingresando..." : "Ingresar"}
            size="medium"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/register")}
            label="Registrarme"
            size="medium"
          />
        </div>
        <Link className="auth-text-link" to="/olvide-password">¿Olvidaste tu contraseña?</Link>
      </form>
      <ButtonBack />
    </main>
  );
};
