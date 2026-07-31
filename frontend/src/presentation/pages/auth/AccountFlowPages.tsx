import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthRepositoryImpl } from "@/core/C-infra/repositories/auth/AuthRepositoryImpl";
import { Button } from "@/shared/ui/button/Button";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import axios from "axios";
import "./AccountFlowPages.css";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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
      <img
        src="/Tesoreria.png"
        alt="Logo del Sistema de Tesorería"
        className="auth-flow__logo"
      />
      <h1>{title}</h1>
      {message && <p role="status">{message}</p>}
      {children}
    </section>
  </main>
);

export const CheckEmailPage = () => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const [message, setMessage] = useState("Enviamos un enlace de activación. Revisa también tu carpeta de spam.");
  const [loading, setLoading] = useState(false);
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
  const [state, setState] = useState("Verificando tu correo...");
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("El enlace no es válido."); return; }
    repository.verifyEmail(token)
      .then(() => setState("Correo verificado. Ya puedes iniciar sesión."))
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
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try { setSuccessMessage(await repository.forgotPassword(email)); }
    catch { setMessage("No fue posible procesar la solicitud. Intenta más tarde."); }
    finally { setLoading(false); }
  };
  const returnToLogin = () => navigate("/login", { replace: true });
  return <>
    <Shell title="Olvidé mi contraseña" message={message}>
      <form onSubmit={submit}>
        <label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)}
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
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    const token = params.get("token");
    if (!token) { setMessage("El enlace no es válido."); return; }
    if (!PASSWORD_PATTERN.test(password)) {
      setMessage("Usa 8 caracteres, mayúscula, minúscula, número y símbolo."); return;
    }
    setLoading(true);
    try {
      await repository.resetPassword(token, password);
      setPasswordUpdated(true);
    } catch (error) { setMessage(recoveryErrorMessage(error)); }
    finally { setLoading(false); }
  };
  const returnToLogin = () => navigate("/login", { replace: true });
  return <>
    <Shell title="Crear nueva contraseña" message={message}>
      <form onSubmit={submit}>
        <label>Nueva contraseña<input type="password" value={password}
          onChange={e => setPassword(e.target.value)} placeholder="Ej: ClaveSegura1!"
          autoComplete="new-password" required /></label>
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
