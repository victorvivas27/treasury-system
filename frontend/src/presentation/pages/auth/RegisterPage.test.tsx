import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/presentation/context/AuthContext";
import { RegisterPage } from "./RegisterPage";

const registerMock = vi.fn();

vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: vi.fn().mockImplementation(function () {
    return { register: registerMock };
  }),
}));

vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: vi.fn() }));

describe("RegisterPage", () => {
  it("[RegisterPage #01] registra, inicia sesión y entra a la aplicación", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    registerMock.mockResolvedValue({});
    vi.mocked(useAuth).mockReturnValue({ login } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<h1>Inicio</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana Pérez" } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@mail.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Password1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(registerMock).toHaveBeenCalled());
    await waitFor(() => expect(login).toHaveBeenCalledWith("ana@mail.com", "Password1!"));
    expect(await screen.findByRole("heading", { name: "Inicio" })).toBeInTheDocument();
  });
});
