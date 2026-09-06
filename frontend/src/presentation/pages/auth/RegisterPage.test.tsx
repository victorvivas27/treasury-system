import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./RegisterPage";

const registerMock = vi.fn();
vi.mock("@/core/C-infra/repositories/organization/OrganizationRepositoryImpl", () => ({
  OrganizationRepositoryImpl: class {
    getLoginOptions = vi.fn().mockResolvedValue([
      { id: 1, name: "Curso anterior", type: "LEGACY", slug: "default" },
      { id: 2, name: "Colegio", type: "SCHOOL", slug: "colegio" },
      { id: 4, name: "4A", type: "COURSE" },
      { id: 5, name: "5A", type: "COURSE" },
    ]);
  },
}));

vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: vi.fn().mockImplementation(function () {
    return { register: registerMock };
  }),
}));

describe("RegisterPage", () => {
  it.each([1, 5])("[RegisterPage #01] registra en el curso %s y solicita revisar el correo", async (courseId) => {
    registerMock.mockClear();
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
    fireEvent.change(screen.getByLabelText("Repite tu contraseña"), { target: { value: "Password1!" } });
    await screen.findByRole("option", { name: "5A" });
    expect(screen.getByRole("option", { name: "Curso anterior" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Colegio" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(registerMock).not.toHaveBeenCalled();
    expect(screen.getByText("Selecciona un curso para crear tu cuenta.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Selecciona tu curso"), { target: { value: String(courseId) } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ organizationId: courseId })));
    expect(await screen.findByRole("heading", { name: "Revisa tu correo" })).toBeInTheDocument();
  });

  it("[RegisterPage #02] muestra ejemplos flotantes y permite volver", () => {
    render(
      <MemoryRouter initialEntries={["/", "/register"]} initialIndex={1}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<h1>Página de inicio</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("img", { name: "Logo de Tesorería Escolar" }))
      .toHaveAttribute("src", "/icono-tesoreria-loader.png");
    expect(screen.getByRole("heading", { name: "Regístrate como usuario" }))
      .toBeInTheDocument();
    expect(screen.getByText("Accede a Tesorería Escolar")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("placeholder", "Ej.: Ana Pérez");
    expect(screen.getByLabelText("Correo")).toHaveAttribute(
      "placeholder", "Ej.: nombre@correo.cl");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "placeholder", "Ej.: ClaveSegura1!");

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByRole("heading", { name: "Página de inicio" })).toBeInTheDocument();
  });
});
