import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { captureInitialAccountLinkToken, releaseInitialAccountLinkToken } from "@/shared/security/accountLinkToken";
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "./AccountFlowPages";

const verifyEmail = vi.hoisted(() => vi.fn());
const validateInvitation = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const resetPassword = vi.hoisted(() => vi.fn());
const establishSession = vi.hoisted(() => vi.fn());
const forgotPassword = vi.hoisted(() => vi.fn());

vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: class { validateInvitation = validateInvitation; verifyEmail = verifyEmail; resetPassword = resetPassword; forgotPassword = forgotPassword; },
}));
vi.mock("lottie-react", () => ({ Lottie: () => <span data-testid="back-animation" /> }));

vi.mock("@/presentation/context/AuthContext", () => ({
  useAuth: () => ({ establishSession }),
}));

describe("VerifyEmailPage", () => {
  it("acepta la invitación con token y credenciales sin pedir IDs de pertenencia", async () => {
    resetPassword.mockClear();
    resetPassword.mockResolvedValue("Cuenta habilitada");
    render(<MemoryRouter initialEntries={["/aceptar-invitacion?token=invitation-test"]}>
      <ResetPasswordPage invitation />
    </MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Aceptar invitación" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText("Nueva contraseña"), { target: { value: "Invited1!" } });
    fireEvent.change(screen.getByLabelText("Repite tu contraseña"), { target: { value: "Invited1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Activar mi cuenta" }));
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("invitation-test", "Invited1!"));
    resetPassword.mockClear();
  });

  it("valida el token en fragmento y no ofrece formulario si ya fue usado", async () => {
    validateInvitation.mockRejectedValueOnce(new Error("used"));
    render(<MemoryRouter initialEntries={["/aceptar-invitacion#token=used-token"]}>
      <ResetPasswordPage invitation />
    </MemoryRouter>);
    await waitFor(() => expect(validateInvitation).toHaveBeenCalledWith("used-token"));
    expect(await screen.findByText(/No fue posible actualizar/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contrase\u00f1a")).not.toBeInTheDocument();
  });

  it("exige contraseñas iguales antes de restablecer y permite corregirlas", async () => {
    resetPassword.mockResolvedValue(undefined);
    render(<MemoryRouter initialEntries={["/reset-password?token=recovery-test"]}>
      <ResetPasswordPage />
    </MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "Password1!" } });
    fireEvent.change(screen.getByLabelText("Repite tu contraseña"), { target: { value: "Different1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar contraseña" }));
    expect(screen.getByText("Las contraseñas deben coincidir")).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Repite tu contraseña"), { target: { value: "Password1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar contraseña" }));
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("recovery-test", "Password1!"));
  });

  it("procesa una sola vez el token aunque StrictMode repita el efecto", async () => {
    verifyEmail.mockResolvedValue({ message: "Correo verificado sin activar acceso" });

    render(<StrictMode><MemoryRouter initialEntries={["/verificar-correo?token=abc123"]}>
      <Routes>
        <Route path="/verificar-correo" element={<VerifyEmailPage />} />
        <Route path="/" element={<p>Home autenticada</p>} />
      </Routes>
    </MemoryRouter></StrictMode>);

    expect(await screen.findByText("Correo verificado sin activar acceso")).toBeInTheDocument();
    await waitFor(() => expect(verifyEmail).toHaveBeenCalledTimes(1));
    expect(verifyEmail).toHaveBeenCalledWith("abc123");
    expect(establishSession).not.toHaveBeenCalled();
  });
});

describe("enlaces privados sin persistencia del token", () => {
  afterEach(() => {
    releaseInitialAccountLinkToken();
    window.history.replaceState(null, "", "/");
  });

  it.each(["?token=legacy-proof", "#token=fragment-proof"])("verifica correo con %s tras limpiar la URL antes de React", async (suffix) => {
    verifyEmail.mockReset().mockResolvedValue({ message: "Correo verificado" });
    window.history.replaceState(null, "", `/verificar-correo${suffix}`);
    captureInitialAccountLinkToken();
    expect(window.location.href).not.toContain("token=");
    render(<StrictMode><BrowserRouter><VerifyEmailPage /></BrowserRouter></StrictMode>);
    expect(await screen.findByText("Correo verificado")).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledTimes(1);
    expect(verifyEmail).toHaveBeenCalledWith(suffix.includes("legacy") ? "legacy-proof" : "fragment-proof");
  });

  it.each([
    ["/restablecer-password", false, "Actualizar contrase\u00f1a"],
    ["/aceptar-invitacion", true, "Activar mi cuenta"],
  ] as const)("conserva en memoria el token nuevo y antiguo de %s", async (path, invitation, action) => {
    resetPassword.mockReset().mockResolvedValue(undefined);
    validateInvitation.mockReset().mockResolvedValue(undefined);
    window.history.replaceState(null, "", `${path}#token=memory-proof`);
    captureInitialAccountLinkToken();
    render(<StrictMode><BrowserRouter><ResetPasswordPage invitation={invitation} /></BrowserRouter></StrictMode>);
    fireEvent.change(await screen.findByLabelText("Nueva contrase\u00f1a"), { target: { value: "Changed1!" } });
    fireEvent.change(screen.getByLabelText("Repite tu contrase\u00f1a"), { target: { value: "Changed1!" } });
    fireEvent.click(screen.getByRole("button", { name: action }));
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("memory-proof", "Changed1!"));
    expect(window.location.href).not.toContain("token=");
  });

  it("mantiene limpio un enlace rechazado y no establece una sesi\u00f3n", async () => {
    verifyEmail.mockReset().mockRejectedValue(new Error("expired or used"));
    window.history.replaceState(null, "", "/verificar-correo?token=expired-proof");
    render(<StrictMode><BrowserRouter><VerifyEmailPage /></BrowserRouter></StrictMode>);
    expect(await screen.findByText(/El enlace es inv\u00e1lido, venci\u00f3 o ya fue utilizado/)).toBeInTheDocument();
    expect(window.location.href).not.toContain("token=");
    expect(establishSession).not.toHaveBeenCalled();
  });
});

const renderRecovery = () => render(
  <MemoryRouter initialEntries={["/login", "/olvide-password"]} initialIndex={1}>
    <Routes>
      <Route path="/olvide-password" element={<ForgotPasswordPage />} />
      <Route path="/login" element={<h1>Inicio de sesión</h1>} />
    </Routes>
  </MemoryRouter>,
);

describe("ForgotPasswordPage", () => {
  it("bloquea reintentos durante Retry-After y habilita el envío al terminar", async () => {
    vi.useFakeTimers();
    try {
      forgotPassword.mockReset().mockRejectedValue(new AxiosError("Too many requests", undefined, undefined, undefined, {
        status: 429, statusText: "Too Many Requests", data: {}, headers: { "retry-after": "2" },
        config: { headers: new AxiosHeaders() },
      }));
      renderRecovery();
      fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "usuario@example.test" } });
      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Enviar instrucciones" })); });
      expect(screen.getByRole("button", { name: "Reintentar en 2 s" })).toBeDisabled();
      fireEvent.submit(screen.getByLabelText("Correo").closest("form")!);
      expect(forgotPassword).toHaveBeenCalledTimes(1);
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(screen.getByRole("button", { name: "Reintentar en 1 s" })).toBeDisabled();
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(screen.getByRole("button", { name: "Enviar instrucciones" })).toBeEnabled();
    } finally { vi.useRealTimers(); }
  });

  it("impide envíos duplicados y cambios de correo mientras procesa", async () => {
    let resolve!: (value: { message: string }) => void;
    forgotPassword.mockReset().mockImplementation(() => new Promise(done => { resolve = done; }));
    renderRecovery();
    const email = screen.getByLabelText("Correo");
    fireEvent.change(email, { target: { value: "usuario@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
    fireEvent.submit(email.closest("form")!);
    expect(forgotPassword).toHaveBeenCalledTimes(1);
    expect(email).toBeDisabled();
    await act(async () => { resolve({ message: "Si existe una cuenta, recibirás instrucciones." }); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("avisa si el servidor no entrega cursos utilizables", async () => {
    forgotPassword.mockReset().mockResolvedValue({ requiresOrganizationSelection: true, organizationOptions: [] });
    renderRecovery();
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "usuario@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No fue posible procesar la solicitud");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("muestra los errores de correo que devuelve el servidor debajo del campo", async () => {
    forgotPassword.mockReset().mockRejectedValue(new AxiosError("Invalid data", undefined, undefined, undefined, {
      status: 422, statusText: "Unprocessable Entity", data: { errors: { email: "Corrige el formato del correo" } },
      headers: {}, config: { headers: new AxiosHeaders() },
    }));
    renderRecovery();
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "usuario@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Corrige el formato del correo");
    expect(screen.getByLabelText("Correo")).toHaveAttribute("aria-describedby", "recovery-email-error");
  });

  it("valida el correo al salir y al enviar, sin llamar al servidor", () => {
    forgotPassword.mockReset();
    renderRecovery();
    const email = screen.getByLabelText("Correo");
    fireEvent.blur(email);
    expect(screen.getByRole("alert")).toHaveTextContent("Ingrese su correo electrónico");
    fireEvent.change(email, { target: { value: "correo-invalido" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingrese un correo válido");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(forgotPassword).not.toHaveBeenCalled();
    fireEvent.change(email, { target: { value: "usuario@example.test" } });
    expect(email).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no muestra cursos ni pide una segunda solicitud para la recuperación multicurso", async () => {
    forgotPassword.mockReset().mockResolvedValue({ message: "Si existe una cuenta, recibirás instrucciones.",
      requiresOrganizationSelection: false, organizationOptions: [] });
    renderRecovery();
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "usuario@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
    await screen.findByRole("dialog");
    expect(screen.queryByLabelText("Curso")).not.toBeInTheDocument();
    expect(forgotPassword).toHaveBeenCalledExactlyOnceWith("usuario@example.test");
  });
  it("muestra el error de envío y permite volver con el botón compartido", async () => {
    forgotPassword.mockReset().mockRejectedValue(new Error("offline"));
    renderRecovery();
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "usuario@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No fue posible procesar la solicitud");
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByRole("heading", { name: "Inicio de sesión" })).toBeInTheDocument();
  });

  it("confirma el envío, bloquea el fondo y regresa al login al cerrar", async () => {
    forgotPassword.mockReset().mockResolvedValue({ message: "Revisa tu correo para continuar." });
    renderRecovery();
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "usuario@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Revisa tu correo para continuar.");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.getByRole("heading", { name: "Inicio de sesión" })).toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
