import { PasswordStrength, PASSWORD_PATTERN } from "@/shared/ui/passwordstrength/PasswordStrength";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import type { LoginOrganizationOption } from "@/core/A-domain/entities/auth/Auth";
import { Button } from "@/shared/ui/button/Button";
import { ButtonBack } from "@/shared/ui/buttonback/ButtonBack";
import { RxEyeClosed } from "react-icons/rx";
import { TfiEye } from "react-icons/tfi";
import { FiLock, FiLogIn, FiMail } from "react-icons/fi";
import axios from "axios";
import { loginPerformance } from "@/shared/performance/loginPerformance";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import loginIllustration from "@/assets/community-icons/principal_login.webp";
import "./LoginPage.css";

const FIELDS = [
  { name: "correo", label: "Correo", type: "email", placeholder: "Ej.: nombre@correo.cl", autoComplete: "username", Icon: FiMail },
  { name: "password", label: "Contraseña", type: "password", placeholder: "Ej.: ClaveSegura1!", autoComplete: "current-password", Icon: FiLock },
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const loginErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return "Correo o contraseña inválidos";
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return "El servidor tardó demasiado en responder. Espera unos segundos e intenta nuevamente.";
  }

  if (!error.response) {
    return "No fue posible conectar con el servidor. Revisa tu conexión e intenta nuevamente.";
  }

  if (error.response.status !== 429) return "Correo o contraseña inválidos";

  const errors = error.response.data?.errors;
  if (errors && typeof errors === "object") {
    const message = Object.values(errors).find((value) => typeof value === "string");
    if (typeof message === "string") return message;
  }

  return "Demasiados intentos fallidos. Espera un minuto antes de volver a intentarlo.";
};

export const LoginPage = () => {
  const [credentials, setCredentials] = useState({ correo: "", password: "" });
  const [organizationId, setOrganizationId] = useState("");
  const [organizationOptions, setOrganizationOptions] = useState<LoginOrganizationOption[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { login, loading: sessionLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasOrganizationOptions = organizationOptions.length > 0;
  const requestedDestination = (location.state as { from?: string } | null)?.from;
  const destination = requestedDestination && requestedDestination !== "/login" ? requestedDestination : "/";
  const updateCredential = (name: keyof typeof credentials, value: string) => {
    setCredentials(current => ({ ...current, [name]: value }));
    setOrganizationOptions([]);
    setOrganizationId("");
    setFieldErrors(current => ({ ...current, [name]: "", organization: "" }));
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    // Password managers may fill the inputs without notifying React.
    const formData = new FormData(event.currentTarget);
    const correo = String(formData.get("correo") ?? "");
    const password = String(formData.get("password") ?? "");
    const credentialsChanged = correo !== credentials.correo || password !== credentials.password;
    const selectedOrganizationId = credentialsChanged ? "" : organizationId;
    setCredentials({ correo, password });
    if (credentialsChanged) {
      setOrganizationOptions([]);
      setOrganizationId("");
    }
    setError(null);
    const validationErrors: Record<string, string> = {};
    if (!EMAIL_PATTERN.test(correo.trim())) {
      validationErrors.correo = "Ingrese un correo válido";
    }
    if (!PASSWORD_PATTERN.test(password)) {
      validationErrors.password = "Use 8 caracteres, mayúscula, minúscula, número y especial";
    }
    if (!credentialsChanged && organizationOptions.length > 0 && !selectedOrganizationId) {
      validationErrors.organization = "Seleccione un curso";
    }
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      document.getElementById(`login-${Object.keys(validationErrors)[0]}`)?.focus();
      return;
    }

    try {
      setSubmitting(true);
      loginPerformance.start();
      const response = await login(correo.trim(), password,
        selectedOrganizationId ? Number(selectedOrganizationId) : undefined);
      if (response.requiresOrganizationSelection) {
        const options = response.organizationOptions ?? [];
        setOrganizationOptions(options);
        setOrganizationId(options[0]?.id ? String(options[0].id) : "");
        setError(null);
        return;
      }
      loginPerformance.mark("response");
      navigate(destination, { replace: true });
      loginPerformance.mark("navigation");
    } catch (loginError) {
      setError(loginErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading && !submitting) return null;
  if (isAuthenticated) return <Navigate to={destination} replace />;

  return (
    <main className="form-page-container login-page">
      <div className="login-illustration" aria-hidden="true">
        <img src={loginIllustration} alt="" width="1536" height="1024" fetchPriority="high" />
      </div>
      <section className="login-panel" aria-labelledby="login-title">
      <header className="form-page-header login-page-header">
        <BrandLogo className="login-brand-logo" />
        <div className="login-page-header__copy">
          <h1 id="login-title" className="form-page-header__title">Iniciar sesión</h1>
          <p className="form-page-header__subtitle">Accede a Tesorería Escolar</p>
        </div>
      </header>
      <form className="form-card login-form" onSubmit={handleSubmit} noValidate>
        {FIELDS.map(({ name, label, type, placeholder, autoComplete, Icon }) => (
          <div className="form-group" key={name}>
            <span className="login-input-wrapper login-floating-field">
              <input id={`login-${name}`} name={name}
                className={`form-input ${name === "password" ? "password-input" : ""} ${fieldErrors[name] ? "input-error" : ""}`}
                type={name === "password" && showPassword ? "text" : type}
                placeholder={placeholder} autoComplete={autoComplete}
                value={credentials[name]} onChange={event => updateCredential(name, event.target.value)}
                aria-invalid={Boolean(fieldErrors[name])}
                aria-describedby={[
                  name === "password" && "login-password-guidance",
                  fieldErrors[name] && `login-${name}-error`,
                ].filter(Boolean).join(" ") || undefined}
                required />
              <label htmlFor={`login-${name}`} className="login-floating-label">{label}</label>
              <Icon className="login-field-icon" aria-hidden="true" />
              {name === "password" && <button
                className="password-visibility-button login-password-visibility" type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword} onClick={() => setShowPassword(visible => !visible)}>
                {showPassword ? <TfiEye aria-hidden="true" /> : <RxEyeClosed aria-hidden="true" />}
              </button>}
            </span>
            {fieldErrors[name] && <span id={`login-${name}-error`} className="error-message" role="alert">
              {fieldErrors[name]}
            </span>}
            {name === "password" && <PasswordStrength id="login-password-guidance" password={credentials.password} />}
          </div>
        ))}
        <div className="login-organization-slot">
          {hasOrganizationOptions && (
            <div className="form-group login-organization-group">
              <label className="login-organization-label" htmlFor="login-organization">
                Selecciona el curso
              </label>
              <span className="login-input-wrapper">
                <select
                  id="login-organization"
                  className={`form-input login-organization-select ${fieldErrors.organization ? "input-error" : ""}`}
                  value={organizationId}
                  onChange={(event) => {
                    setOrganizationId(event.target.value);
                    setFieldErrors((current) => ({ ...current, organization: "" }));
                  }}
                  aria-invalid={Boolean(fieldErrors.organization)}
                  aria-describedby={fieldErrors.organization ? "login-organization-error" : undefined}
                  required
                >
                  {organizationOptions.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.slug === "default" ? "Administración general" : organization.name}
                    </option>
                  ))}
                </select>
              </span>
              {fieldErrors.organization && (
                <span id="login-organization-error" className="error-message" role="alert">{fieldErrors.organization}</span>
              )}
            </div>
          )}
        </div>
        {error && <p className="form-submit-message is-visible" role="alert" aria-live="polite">{error}</p>}
        <div className="login-form-actions">
          <Button
            type="submit"
            onClick={() => {}}
            loading={submitting}
            label={submitting ? "Ingresando..." : "Ingresar"}
            icon={<FiLogIn aria-hidden="true" />}
            size="medium"
          />
        </div>
        <p className="login-invitation">El acceso se habilita mediante una invitación enviada por la administración.</p>
        <Link className="auth-text-link" to="/olvide-password">¿Olvidaste tu contraseña?</Link>
      <ButtonBack className="login-back-button" />
      </form>
      </section>
    </main>
  );
};
