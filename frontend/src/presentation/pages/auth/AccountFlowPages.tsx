import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthRepositoryImpl } from "@/core/C-infra/repositories/auth/AuthRepositoryImpl";
import type { LoginOrganizationOption, LoginResponse } from "@/core/A-domain/entities/auth/Auth";
import { useAuth } from "@/presentation/context/AuthContext";
import { Button } from "@/shared/ui/button/Button";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import { RxEyeClosed } from "react-icons/rx";
import { TfiEye } from "react-icons/tfi";
import axios from "axios";
import "./AccountFlowPages.css";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const VERIFICATION_CHANNEL = "treasury-email-verification";
type VerificationMessage =
  | { type: "verified"; requestId: string; session: LoginResponse }
  | { type: "received"; requestId: string };

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
      <BrandLogo className="auth-flow__logo" />
      <h1>{title}</h1>
      {message && <p role="status">{message}</p>}
      {children}
    </section>
  </main>
);

export const CheckEmailPage = () => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const location = useLocation();
  const navigate = useNavigate();
  const { establishSession } = useAuth();
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const [message, setMessage] = useState("Enviamos un enlace de activación. Revisa también tu carpeta de spam.");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(VERIFICATION_CHANNEL);
    channel.onmessage = ({ data }: MessageEvent<VerificationMessage>) => {
      if (data?.type !== "verified" || !data.session?.token || !data.session.user) return;
      establishSession(data.session);
      channel.postMessage({ type: "received", requestId: data.requestId } satisfies VerificationMessage);
      navigate("/", { replace: true });
    };
    return () => channel.close();
  }, [establishSession, navigate]);
  const resend = async () => {
    if (!email) return;
    setLoading(true);
    try { setMessage(await repository.resendVerification(email)); }
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
  const navigate = useNavigate();
  const { establishSession } = useAuth();
  const [state, setState] = useState("Verificando tu correo...");
  const processedTokenRef = useRef<string | null>(null);
  useEffect(() => {
    let channel: BroadcastChannel | undefined;
    let fallbackTimer: number | undefined;
    let closeFallbackTimer: number | undefined;
    const token = params.get("token");
    if (!token) { setState("El enlace no es válido."); return; }
    if (processedTokenRef.current === token) return;
    processedTokenRef.current = token;
    setState("Verificando tu correo...");
    repository.verifyEmail(token)
      .then((session) => {
        establishSession(session);
        if ("BroadcastChannel" in window) {
          channel = new BroadcastChannel(VERIFICATION_CHANNEL);
          const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          channel.onmessage = ({ data }: MessageEvent<VerificationMessage>) => {
            if (data?.type !== "received" || data.requestId !== requestId) return;
            window.clearTimeout(fallbackTimer);
            channel?.close();
            window.close();
            closeFallbackTimer = window.setTimeout(() => navigate("/", { replace: true }), 250);
          };
          channel.postMessage({ type: "verified", requestId, session } satisfies VerificationMessage);
          fallbackTimer = window.setTimeout(() => {
            channel?.close();
            navigate("/", { replace: true });
          }, 600);
          return;
        }
        navigate("/", { replace: true });
      })
      .catch(() => setState("El enlace es inválido, venció o ya fue utilizado."));
    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(closeFallbackTimer);
      channel?.close();
    };
  }, [establishSession, navigate, params, repository]);
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

export const ResetPasswordPage = () => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
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
    <Shell title="Crear nueva contraseña" message={message}>
      <form onSubmit={submit}>
        <input type="hidden" name="recoveryToken" value={token} />
        <label>Nueva contraseña
          <span className="auth-flow__password-field">
            <input type={showPassword ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Ej: ClaveSegura1!"
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
