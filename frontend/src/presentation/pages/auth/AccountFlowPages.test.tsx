import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ResetPasswordPage, VerifyEmailPage } from "./AccountFlowPages";

const verifyEmail = vi.hoisted(() => vi.fn());
const validateInvitation = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const resetPassword = vi.hoisted(() => vi.fn());
const establishSession = vi.hoisted(() => vi.fn());

vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: class { validateInvitation = validateInvitation; verifyEmail = verifyEmail; resetPassword = resetPassword; },
}));

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
