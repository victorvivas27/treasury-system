import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordPage as PublishedForgot, ResetPasswordPage as PublishedReset,
  VerifyEmailPage as PublishedVerify } from "../build/bridge-fixtures/AccountFlowPages.v1.34.0";
import { ForgotPasswordPage as CurrentForgot } from "@/presentation/pages/auth/AccountFlowPages";

const api = vi.hoisted(() => ({ forgotPassword: vi.fn(), resetPassword: vi.fn(), verifyEmail: vi.fn(), validateInvitation: vi.fn() }));
vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({ AuthRepositoryImpl: class {
  forgotPassword = api.forgotPassword; resetPassword = api.resetPassword;
  verifyEmail = api.verifyEmail; validateInvitation = api.validateInvitation;
} }));
vi.mock("lottie-react", () => ({ Lottie: () => <span /> }));

describe("production v1.34.0 frontend / bridge response contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.forgotPassword.mockResolvedValue({ message: "Si existe una cuenta, recibirás instrucciones.", requiresOrganizationSelection: false, organizationOptions: [] });
    api.resetPassword.mockResolvedValue("Actualizada");
    api.verifyEmail.mockResolvedValue({ message: "Correo verificado" });
    api.validateInvitation.mockResolvedValue(undefined);
  });

  it.each(["published", "current"])("%s frontend accepts multicourse recovery without a public course selector", async version => {
    const Component = version === "published" ? PublishedForgot : CurrentForgot;
    render(<MemoryRouter initialEntries={["/olvide-password"]}><Component /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "multicourse@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
    await waitFor(() => expect(api.forgotPassword).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Si existe una cuenta, recibirás instrucciones.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("published frontend submits the bridge verification query token", async () => {
    render(<MemoryRouter initialEntries={["/verificar-correo?token=bridge-proof"]}><PublishedVerify /></MemoryRouter>);
    expect(await screen.findByText("Correo verificado")).toBeInTheDocument();
    expect(api.verifyEmail).toHaveBeenCalledWith("bridge-proof");
  });

  it.each([false, true])("published frontend completes query reset / invitation=%s", async invitation => {
    render(<MemoryRouter initialEntries={[`${invitation ? "/aceptar-invitacion" : "/restablecer-password"}?token=bridge-proof`]}>
      <PublishedReset invitation={invitation} />
    </MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Nueva contraseña"), { target: { value: "BridgeProof1!" } });
    fireEvent.change(screen.getByLabelText("Repite tu contraseña"), { target: { value: "BridgeProof1!" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: invitation ? "Activar mi cuenta" : "Actualizar contraseña" })); });
    expect(api.resetPassword).toHaveBeenCalledWith("bridge-proof", "BridgeProof1!");
  });
});
