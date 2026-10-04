import { PasswordStrength, PASSWORD_PATTERN } from "@/shared/ui/passwordstrength/PasswordStrength";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthRepositoryImpl } from "@/core/C-infra/repositories/auth/AuthRepositoryImpl";
import type { LoginOrganizationOption } from "@/core/A-domain/entities/auth/Auth";
import { Button } from "@/shared/ui/button/Button";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import { RxEyeClosed } from "react-icons/rx";
import { TfiEye } from "react-icons/tfi";
import axios from "axios";
import "./AccountFlowPages.css";

const recoveryErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) return "No fue posible actualizar la contraseña. Intenta nuevamente.";
  const errors = error.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const message = Object.values(errors).find(value => typeof value === "string");
    if (typeof message === "string") return message;
  }
  return "No fue posible actualizar la contraseña. Intenta nuevamente.";
};

const Shell = ({ title, message, children }: {
  title: string; message?: string; children?: React.ReactNode;
}) => (
  <main className="auth-flow">
    <section className="auth-flow__card">
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
  const [loading, setLoading] = useState(false);
  const requestingRef = useRef(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (requestingRef.current) return;
    setMessage("");
    requestingRef.current = true;
    setLoading(true);
    try {
      const response = await repository.forgotPassword(
        email, organizationId ? Number(organizationId) : undefined);
      if (response.requiresOrganizationSelection) {
        const options = response.organizationOptions ?? [];
        setOrganizationOptions(options);
        setOrganizationId(options[0]?.id ? String(options[0].id) : "");
        setMessage("");
        return;
      }
      setSuccessMessage(response.message);
    }
    catch { setMessage("No fue posible procesar la solicitud. Intenta más tarde."); }
    finally {
      requestingRef.current = false;
      setLoading(false);
    }
  };
  const returnToLogin = () => navigate("/login", { replace: true });
  return <>
    <Shell title="Olvidé mi contraseña" message={message}>
      <form onSubmit={submit}>
        {organizationOptions.length > 0 && (
          <label>Curso
            <select value={organizationId} onChange={e => setOrganizationId(e.target.value)} required>
              {organizationOptions.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.slug === "default" ? "Administración general" : organization.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>Correo<input type="email" value={email} onChange={e => {
          setEmail(e.target.value);
          setOrganizationOptions([]);
          setOrganizationId("");
        }}
          placeholder="Ej: nombre@correo.cl" autoComplete="email" required /></label>
        <Button type="submit" label="Enviar instrucciones" loading={loading}
          onClick={() => {}} size="large" className="auth-flow__action" />
      </form>
      <Link to="/login">Volver</Link>
    </Shell>
    <ModalAlert isOpen={Boolean(successMessage)} message={successMessage}
      type="success" onClose={returnToLogin} />
  </>;
};

export const ResetPasswordPage = ({ invitation = false }: { invitation?: boolean }) => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
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
    if (submittingRef.current) return;
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
    <Shell title={invitation ? "Aceptar invitación" : "Crear nueva contraseña"} message={message}>
      <form onSubmit={submit}>
        <input type="hidden" name="recoveryToken" value={token} />
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
        <Button type="submit" label="Actualizar contraseña" loading={loading}
          onClick={() => {}} size="large" className="auth-flow__action" />
      </form>
    </Shell>
    <ModalAlert isOpen={passwordUpdated}
      message="Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión."
      type="success" onClose={returnToLogin} autoCloseTime={3000} />
  </>;
};

export const PasswordUpdatedPage = () => <Shell title="Contraseña actualizada"
  message="Tu contraseña fue actualizada correctamente.">
  <Link to="/login">Iniciar sesión</Link>
</Shell>;
