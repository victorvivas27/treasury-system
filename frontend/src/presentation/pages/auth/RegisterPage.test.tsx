import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./RegisterPage";

const registerMock = vi.fn();

vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: vi.fn().mockImplementation(function () {
    return { register: registerMock };
  }),
}));

describe("RegisterPage", () => {
  it("[RegisterPage #01] registra y solicita revisar el correo", async () => {
    registerMock.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/revisa-tu-correo" element={<h1>Revisa tu correo</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana Pérez" } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@mail.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Password1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(registerMock).toHaveBeenCalled());
    expect(await screen.findByRole("heading", { name: "Revisa tu correo" })).toBeInTheDocument();
  });
});
