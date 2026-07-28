import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/presentation/context/AuthContext";
import { LoginPage } from "./LoginPage";

vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: vi.fn() }));

describe("LoginPage", () => {
  it("[LoginPage #01] navega al registro desde el botón Registrarme", () => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/", "/login"]} initialIndex={1}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<h1>Registrar usuario</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Registrarme" }));
    expect(screen.getByRole("heading", { name: "Registrar usuario" })).toBeInTheDocument();
  });

  it("[LoginPage #02] muestra y oculta la contraseña", () => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const password = screen.getByLabelText("Contraseña");

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("[LoginPage #03] muestra errores debajo de campos inválidos y no inicia sesión", () => {
    const login = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      login,
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const correo = screen.getByLabelText("Correo");
    const password = screen.getByLabelText("Contraseña");
    fireEvent.change(correo, { target: { value: "correo-invalido" } });
    fireEvent.change(password, { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByText("Ingrese un correo válido")).toBeInTheDocument();
    expect(screen.getByText(/Use 8 caracteres/)).toBeInTheDocument();
    expect(correo).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(login).not.toHaveBeenCalled();
  });

  it("[LoginPage #04] muestra ejemplos y permite volver al inicio", () => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/", "/login"]} initialIndex={1}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<h1>Página de inicio</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Correo")).toHaveAttribute(
      "placeholder", "Ej.: nombre@correo.cl");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "placeholder", "Ej.: ClaveSegura1!");
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByRole("heading", { name: "Página de inicio" })).toBeInTheDocument();
  });
});
