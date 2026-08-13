import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { VerifyEmailPage } from "./AccountFlowPages";

const verifyEmail = vi.hoisted(() => vi.fn());

vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: class { verifyEmail = verifyEmail; },
}));

describe("VerifyEmailPage", () => {
  it("procesa una sola vez el token aunque StrictMode repita el efecto", async () => {
    verifyEmail.mockResolvedValue("Correo verificado correctamente.");

    render(<StrictMode><MemoryRouter initialEntries={["/verificar-correo?token=abc123"]}>
      <VerifyEmailPage />
    </MemoryRouter></StrictMode>);

    expect(await screen.findByRole("heading", { name: "Correo verificado" }))
      .toBeInTheDocument();
    expect(screen.getByText("¡Todo listo! Ya puedes iniciar sesión con tu cuenta."))
      .toBeInTheDocument();
    await waitFor(() => expect(verifyEmail).toHaveBeenCalledTimes(1));
    expect(verifyEmail).toHaveBeenCalledWith("abc123");
  });
});
