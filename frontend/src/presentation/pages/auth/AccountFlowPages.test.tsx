import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { VerifyEmailPage } from "./AccountFlowPages";

const verifyEmail = vi.hoisted(() => vi.fn());
const establishSession = vi.hoisted(() => vi.fn());

vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: class { verifyEmail = verifyEmail; },
}));

vi.mock("@/presentation/context/AuthContext", () => ({
  useAuth: () => ({ establishSession }),
}));

describe("VerifyEmailPage", () => {
  it("procesa una sola vez el token aunque StrictMode repita el efecto", async () => {
    const session = { token: "jwt", tokenType: "Bearer", expiresIn: 3600,
      user: { id: 1, nombre: "María", correo: "maria@mail.com", rol: "USER" } };
    verifyEmail.mockResolvedValue(session);

    render(<StrictMode><MemoryRouter initialEntries={["/verificar-correo?token=abc123"]}>
      <Routes>
        <Route path="/verificar-correo" element={<VerifyEmailPage />} />
        <Route path="/" element={<p>Home autenticada</p>} />
      </Routes>
    </MemoryRouter></StrictMode>);

    expect(await screen.findByText("Home autenticada")).toBeInTheDocument();
    await waitFor(() => expect(verifyEmail).toHaveBeenCalledTimes(1));
    expect(verifyEmail).toHaveBeenCalledWith("abc123");
    expect(establishSession).toHaveBeenCalledWith(session);
  });
});
