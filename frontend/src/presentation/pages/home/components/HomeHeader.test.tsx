import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { HomeHeader } from "./HomeHeader";

describe("HomeHeader", () => {
  it("muestra la navegación de la comunidad para una sesión autenticada", () => {
    render(<MemoryRouter><HomeHeader isAuthenticated /></MemoryRouter>);

    expect(screen.getByRole("link", { name: "Lo que nos mueve" }))
      .toHaveAttribute("href", "#sobre-nosotros");
    expect(screen.getByRole("link", { name: "Fotos del curso" }))
      .toHaveAttribute("href", "#fotos-del-curso");
    expect(screen.queryByRole("link", { name: "Contacto" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Directiva" })).toHaveAttribute("href", "#directiva");
    expect(screen.getByRole("link", { name: /ver perfil de usuario/i }))
      .toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: /^sistema$/i }))
      .toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  it("envía al administrador a editar el contenido de Lo que nos mueve", () => {
    render(<MemoryRouter><HomeHeader isAuthenticated isAdmin /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /editar lo que nos mueve/i }))
      .toHaveAttribute("href", "/admin/sobre-nosotros");
  });

  it("identifica la sesión y permite cerrarla", () => {
    const onLogout = vi.fn();
    const user = { nombre: "María", profileImageType: "INITIALS" as const, profileImageUrl: null };
    render(<MemoryRouter><HomeHeader isAuthenticated user={user} onLogout={onLogout} /></MemoryRouter>);

    expect(screen.getByText("María")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
  it("abre y cierra el menú móvil accesible", () => {
    render(<MemoryRouter><HomeHeader isAuthenticated /></MemoryRouter>);

    const toggle = screen.getByLabelText(/abrir menú/i);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(screen.getByLabelText(/cerrar menú/i))
      .toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByLabelText(/abrir menú/i))
      .toHaveAttribute("aria-expanded", "false");
  });
});
