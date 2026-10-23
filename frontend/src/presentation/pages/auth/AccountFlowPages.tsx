import { PasswordStrength, PASSWORD_PATTERN } from "@/shared/ui/passwordstrength/PasswordStrength";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthRepositoryImpl } from "@/core/C-infra/repositories/auth/AuthRepositoryImpl";
import type { LoginOrganizationOption } from "@/core/A-domain/entities/auth/Auth";
import { Button } from "@/shared/ui/button/Button";
import { ButtonBack } from "@/shared/ui/buttonback/ButtonBack";
import { FiMail } from "react-icons/fi";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import loginIllustration from "@/assets/community-icons/principal_login.webp";
import { RxEyeClosed } from "react-icons/rx";
import { TfiEye } from "react-icons/tfi";
import axios from "axios";
import { passwordRecoveryFailure, validateRecoveryEmail } from "./passwordRecoveryValidation";
import "./AccountFlowPages.css";
import "./LoginPage.css";

const recoveryErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) return "No fue posible actualizar la contraseña. Intenta nuevamente.";
  const errors = error.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const message = Object.values(errors).find(value => typeof value === "string");
    if (typeof message === "string") return message;
  }
  return "No fue posible actualizar la contraseña. Intenta nuevamente.";
};

const Shell = ({ title, message, children, illustrated = false }: {
  title: string; message?: string; children?: React.ReactNode; illustrated?: boolean;
}) => (
  <main className={`auth-flow${illustrated ? " login-page invitation-page" : ""}`}>
    {illustrated && <div className="login-illustration" aria-hidden="true">
      <img src={loginIllustration} alt="" width="1536" height="1024" fetchPriority="high" />
    </div>}
    <section className={`auth-flow__card${illustrated ? " login-panel" : ""}`}>
      <header className="auth-flow__header">
        <BrandLogo className="auth-flow__logo" />
        <h1>{title}</h1>
      </header>
      {message && <p role="status">{message}</p>}
      {children}
    </section>
  </main>
);

export const CheckEmailPage = () => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const organizationId = (location.state as { organizationId?: number } | null)?.organizationId;
  const [message, setMessage] = useState("Revisa el enlace de tu correo. La verificación del buzón no habilita acceso al curso.");
  const [loading, setLoading] = useState(false);
  const resend = async () => {
    if (!email) return;
    setLoading(true);
    try { setMessage(await repository.resendVerification(email, organizationId)); }
    catch { setMessage("Espera un momento antes de solicitar otro correo."); }
    finally { setLoading(false); }
  };
  return <Shell title="Revisa tu correo" message={message}>
    {email && <Button label="Reenviar verificación" loading={loading} onClick={resend}
      size="large" className="auth-flow__action" />}
    <Link to="/login">Volver al inicio de sesión</Link>
  </Shell>;
};

export const VerifyEmailPage = () => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const [params] = useSearchParams();
  const [state, setState] = useState("Verificando tu correo...");
  const processedTokenRef = useRef<string | null>(null);
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("El enlace no es válido."); return; }
    if (processedTokenRef.current === token) return;
    processedTokenRef.current = token;
    repository.verifyEmail(token)
      .then(response => setState(response.message))
      .catch(() => setState("El enlace es inválido, venció o ya fue utilizado."));
  }, [params, repository]);
  return <Shell title="Verificar correo" message={state}>
    <Link to="/login">Ir al inicio de sesión</Link>
  </Shell>;
};

export const ForgotPasswordPage = () => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [organizationOptions, setOrganizationOptions] = useState<LoginOrganizationOption[]>([]);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const requestingRef = useRef(false);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const retryDeadline = useRef(0);
  useEffect(() => {
    if (!retrySeconds) return;
    const timer = window.setTimeout(() => setRetrySeconds(
      Math.max(0, Math.ceil((retryDeadline.current - Date.now()) / 1000))), 1000);
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);
  useEffect(() => {
    if (!successMessage) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [successMessage]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (requestingRef.current || retrySeconds || successMessage) return;
    setMessage("");
    const errors = {
      email: validateRecoveryEmail(email),
      organization: organizationOptions.length && !organizationOptions.some(option => String(option.id) === organizationId)
        ? "Seleccione un curso válido" : "",
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      document.getElementById(errors.email ? "recovery-email" : "recovery-organization")?.focus();
      return;
    }
    requestingRef.current = true;
    setLoading(true);
    try {
      const response = await repository.forgotPassword(
        email.trim(), organizationId ? Number(organizationId) : undefined);
      if (response.requiresOrganizationSelection) {
        const options = Array.isArray(response.organizationOptions) ? response.organizationOptions.filter(option =>
          Number.isSafeInteger(option.id) && option.id > 0 && typeof option.name === "string" && option.name.trim()) : [];
        setOrganizationOptions(options);
        setOrganizationId(options[0]?.id ? String(options[0].id) : "");
        setMessage(options.length ? "" : "No fue posible cargar los cursos. Intenta nuevamente.");
        return;
      }
      if (typeof response.message !== "string" || !response.message.trim()) throw new Error("Invalid recovery response");
      setSuccessMessage(response.message);
    }
    catch (error) {
      const failure = passwordRecoveryFailure(error);
      setFieldErrors(failure.fields ?? {});
      setMessage(failure.message || (failure.fields?.organization && !organizationOptions.length
        ? failure.fields.organization : ""));
      if (failure.retryAt) {
        retryDeadline.current = failure.retryAt;
        setRetrySeconds(Math.max(1, Math.ceil((failure.retryAt - Date.now()) / 1000)));
      }
    }
    finally {
      requestingRef.current = false;
      setLoading(false);
    }
  };
  const returnToLogin = () => navigate("/login", { replace: true });
  return <>
    <main className="form-page-container login-page">
      <div className="login-illustration" aria-hidden="true">
        <img src={loginIllustration} alt="" width="1536" height="1024" fetchPriority="high" />
      </div>
      <section className="login-panel" aria-labelledby="recovery-title">
      <header className="form-page-header login-page-header">
        <BrandLogo className="login-brand-logo" />
        <div className="login-page-header__copy">
          <h1 id="recovery-title" className="form-page-header__title">Olvidé mi contraseña</h1>
          <p className="form-page-header__subtitle">Recupera el acceso a tu cuenta</p>
        </div>
      </header>
      <form className="login-form recovery-form" onSubmit={submit} noValidate>
        <p className="login-invitation">Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contraseña.</p>
        <div className="form-group">
          <span className="login-input-wrapper login-floating-field">
            <input id="recovery-email" type="email" autoComplete="email"
              className={`form-input ${fieldErrors.email ? "input-error" : ""}`}
              value={email} placeholder="Ej: nombre@correo.cl" required disabled={loading || Boolean(successMessage)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "recovery-email-error" : undefined}
              onBlur={() => setFieldErrors(current => ({ ...current, email: validateRecoveryEmail(email) }))}
              onChange={event => {
                setEmail(event.target.value);
                setOrganizationOptions([]);
                setOrganizationId("");
                setFieldErrors({});
                setMessage("");
              }} />
            <label htmlFor="recovery-email" className="login-floating-label">Correo</label>
            <FiMail className="login-field-icon" aria-hidden="true" />
          </span>
          {fieldErrors.email && <span id="recovery-email-error" className="error-message" role="alert">
            {fieldErrors.email}
          </span>}
        </div>
        {organizationOptions.length > 0 && <div className="form-group">
          <label htmlFor="recovery-organization" className="login-organization-label">Curso</label>
          <select id="recovery-organization" className="form-input login-organization-select"
            value={organizationId} required disabled={loading || Boolean(successMessage)} aria-invalid={Boolean(fieldErrors.organization)}
            aria-describedby={fieldErrors.organization ? "recovery-organization-error" : undefined}
            onChange={event => {
              setOrganizationId(event.target.value);
              setFieldErrors(current => ({ ...current, organization: "" }));
            }}>
            {organizationOptions.map(organization => <option key={organization.id} value={organization.id}>
              {organization.slug === "default" ? "Administración general" : organization.name}
            </option>)}
          </select>
          {fieldErrors.organization && <span id="recovery-organization-error" className="error-message" role="alert">
            {fieldErrors.organization}
          </span>}
        </div>}
        <div className="login-form-actions">
          <Button type="submit" label={retrySeconds ? `Reintentar en ${retrySeconds} s` : "Enviar instrucciones"}
            loading={loading} disabled={retrySeconds > 0 || Boolean(successMessage)}
            icon={<FiMail aria-hidden="true" />} onClick={() => {}} size="medium" />
        </div>
        <div className="recovery-feedback">
          {message && <p className="form-submit-message is-visible" role="alert">{message}</p>}
        </div>
      <ButtonBack className="login-back-button" />
      </form>
      </section>
    </main>
    <div className="recovery-confirmation">
      <ModalAlert isOpen={Boolean(successMessage)} message={successMessage}
        title="Revisa tu correo" type="success" compact onClose={returnToLogin} />
    </div>
  </>;
};

export const ResetPasswordPage = ({ invitation = false }: { invitation?: boolean }) => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get("token") ?? params.get("token") ?? "");
  const [invitationValid, setInvitationValid] = useState(!invitation);
  useEffect(() => {
    if (!invitation) return;
    let active = true;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    repository.validateInvitation(token).then(() => { if (active) setInvitationValid(true); })
      .catch(error => { if (active) setMessage(recoveryErrorMessage(error)); });
    return () => { active = false; };
  }, [invitation, repository, token]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current || !invitationValid) return;
    setMessage("");
    if (!token) { setMessage("El enlace no es válido."); return; }
    if (!PASSWORD_PATTERN.test(password)) {
      setMessage("Usa 8 caracteres, mayúscula, minúscula, número y símbolo."); return;
    }
    if (!confirmPassword || password !== confirmPassword) {
      setConfirmError("Las contraseñas deben coincidir"); return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      await repository.resetPassword(token, password);
      setPasswordUpdated(true);
    } catch (error) { setMessage(recoveryErrorMessage(error)); }
    finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };
  const returnToLogin = () => navigate("/login", { replace: true });
  return <>
    <Shell title={invitation ? "Aceptar invitación" : "Crear nueva contraseña"} message={message} illustrated={invitation}>
      {invitation && !invitationValid && !message && <p role="status">Validando invitacion...</p>}
      {invitationValid && <form onSubmit={submit}>
        <div className="auth-flow__password-row">
        <div className="auth-flow__password-inputs">
        <label>Nueva contraseña
          <span className="auth-flow__password-field">
            <input type={showPassword ? "text" : "password"} value={password}
              onChange={e => { setPassword(e.target.value); setConfirmError(""); }} placeholder="Ej: ClaveSegura1!"
              aria-describedby="reset-password-guidance"
              autoComplete="new-password" required />
            <button
              className="auth-flow__password-toggle"
              type="button"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(visible => !visible)}
            >
              {showPassword ? <TfiEye aria-hidden="true" /> : <RxEyeClosed aria-hidden="true" />}
            </button>
          </span>
        </label>
        <label htmlFor="reset-confirm-password">Repite tu contraseña
          <span className="auth-flow__password-field">
          <input id="reset-confirm-password" type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword} autoComplete="new-password" required
            placeholder="Repite tu contraseña"
            onChange={e => { setConfirmPassword(e.target.value); setConfirmError(""); }}
            aria-invalid={Boolean(confirmError)}
            aria-describedby={confirmError ? "reset-confirm-password-error" : undefined} />
          <button
            className="auth-flow__password-toggle"
            type="button"
            aria-label={showConfirmPassword ? "Ocultar contraseña repetida" : "Mostrar contraseña repetida"}
            aria-pressed={showConfirmPassword}
            onClick={() => setShowConfirmPassword((visible) => !visible)}
          >
            {showConfirmPassword ? <TfiEye aria-hidden="true" /> : <RxEyeClosed aria-hidden="true" />}
          </button>
          </span>
        </label>
        {confirmError && <span id="reset-confirm-password-error" className="error-message" role="alert">{confirmError}</span>}
        </div>
        <PasswordStrength id="reset-password-guidance" password={password} />
        </div>
        <Button type="submit" label={invitation ? "Activar mi cuenta" : "Actualizar contraseña"} loading={loading}
          onClick={() => {}} size="large" className="auth-flow__action" />
      </form>}
    </Shell>
    <ModalAlert isOpen={passwordUpdated}
      message={invitation ? "Tu cuenta fue activada. Ya puedes iniciar sesión." : "Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión."}
      type="success" onClose={returnToLogin} autoCloseTime={3000} />
  </>;
};

export const PasswordUpdatedPage = () => <Shell title="Contraseña actualizada"
  message="Tu contraseña fue actualizada correctamente.">
  <Link to="/login">Iniciar sesión</Link>
</Shell>;
