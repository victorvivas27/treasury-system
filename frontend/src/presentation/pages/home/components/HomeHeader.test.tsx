import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeHeader } from "./HomeHeader";

const architectureAccess = vi.hoisted(() => ({ allowed: false }));
vi.mock("@/presentation/hooks/architecture/useArchitectureAccess", () => ({
  useArchitectureAccess: () => architectureAccess,
}));

describe("HomeHeader", () => {
  beforeEach(() => { architectureAccess.allowed = false; });
  afterEach(() => vi.useRealTimers());
  it("muestra el icono de arquitectura al dueño y cierra el menú al seleccionarlo", () => {
    architectureAccess.allowed = true;
    render(<MemoryRouter><HomeHeader isAuthenticated isSuperAdmin /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText(/abrir menú/i));
    const link = screen.getByRole("link", { name: "Arquitectura del sistema" });
    expect(link).toHaveAttribute("href", "/admin/arquitectura");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(link);
    expect(screen.getByLabelText(/abrir menú/i)).toHaveAttribute("aria-expanded", "false");
  });

  it("oculta arquitectura a visitantes, administradores y SUPER_ADMIN sin permiso", () => {
    const { rerender } = render(<MemoryRouter><HomeHeader /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Arquitectura del sistema" })).not.toBeInTheDocument();
    architectureAccess.allowed = true;
    rerender(<MemoryRouter><HomeHeader isAuthenticated isAdmin /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Arquitectura del sistema" })).not.toBeInTheDocument();
    architectureAccess.allowed = false;
    rerender(<MemoryRouter><HomeHeader isAuthenticated isSuperAdmin /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Arquitectura del sistema" })).not.toBeInTheDocument();
  });
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
    expect(screen.getByRole("link", { name: /^gestion del curso$/i }))
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
    const container = document.body;
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector(".public-home__menu-timer")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByLabelText(/cerrar menú/i))
      .toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector(".public-home__menu-timer")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByLabelText(/abrir menú/i))
      .toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector(".public-home__menu-timer")).not.toBeInTheDocument();
  });

  it("cierra automáticamente el menú móvil para USER y ADMIN", () => {
    vi.useFakeTimers();
    const { rerender } = render(<MemoryRouter><HomeHeader isAuthenticated /></MemoryRouter>);

    fireEvent.click(screen.getByLabelText(/abrir menú/i));
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByLabelText(/abrir menú/i)).toHaveAttribute("aria-expanded", "false");

    rerender(<MemoryRouter><HomeHeader isAuthenticated isAdmin /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText(/abrir menú/i));
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByLabelText(/abrir menú/i)).toHaveAttribute("aria-expanded", "false");
  });
});
