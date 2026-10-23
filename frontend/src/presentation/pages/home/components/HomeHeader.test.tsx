import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) });
});
import { HomeHeader } from "./HomeHeader";

const architectureAccess = vi.hoisted(() => ({ allowed: false }));
vi.mock("@/presentation/hooks/architecture/useArchitectureAccess", () => ({
  useArchitectureAccess: () => architectureAccess,
}));

describe("HomeHeader", () => {
  it("muestra los accesos administrativos directamente en móvil sin un segundo desplegable", () => {
    const media = window.matchMedia("(max-width: 1023px)");
    vi.mocked(window.matchMedia).mockReturnValueOnce({ ...media, matches: true });
    render(<MemoryRouter><HomeHeader isAuthenticated isAdmin /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText(/abrir menú/i));
    expect(screen.queryByText("Administrar")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Editar Directiva" });
    expect(link.closest("details")).toBeNull();
    fireEvent.click(link);
    expect(screen.getByLabelText(/abrir menú/i)).toHaveAttribute("aria-expanded", "false");
  });
  it("mantiene el panel hasta finalizar la salida y bloquea sus enlaces durante la animación", () => {
    render(<MemoryRouter><HomeHeader isAuthenticated isAdmin /></MemoryRouter>);
    const summary = screen.getByText("Administrar").closest("summary")!;
    const details = summary.closest("details")!;
    const panel = details.querySelector<HTMLElement>(".public-home__administration-links")!;
    const animation = { onfinish: null as (() => void) | null, cancel: vi.fn() };
    panel.animate = vi.fn().mockReturnValue(animation);
    fireEvent.click(summary);
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(panel.inert).toBe(true);
    expect(panel.animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ duration: 160 }));
    act(() => animation.onfinish?.());
    expect(details).not.toHaveAttribute("open");
    expect(panel.inert).toBe(false);
    expect(animation.cancel).toHaveBeenCalledOnce();
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
  });
  it("agrupa administración y cierra el desplegable con Escape y clic exterior", () => {
    render(<MemoryRouter><HomeHeader isAuthenticated isAdmin user={{
      nombre: "María de los Ángeles González Fernández", profileImageType: "INITIALS", profileImageUrl: null,
    }} /></MemoryRouter>);
    expect(screen.getByText("María de los Ángeles González Fernández")).toBeInTheDocument();
    const summary = screen.getByText("Administrar").closest("summary")!;
    const details = summary.closest("details")!;
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(details).not.toHaveAttribute("open");
    expect(summary).toHaveFocus();
    fireEvent.click(summary);
    fireEvent.pointerDown(document.body);
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(summary);
    fireEvent.click(screen.getByRole("link", { name: "Editar Directiva" }));
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByRole("link", { name: /gestion del curso/i })).toHaveAttribute("href", "/dashboard");
  });
  it("mantiene instalar app e iniciar sesión dentro de la navegación pública", () => {
    render(<MemoryRouter><HomeHeader /></MemoryRouter>);
    const nav = screen.getByRole("navigation", { name: "Acceso a la plataforma" });
    expect(nav).toContainElement(screen.getByRole("button", { name: "Abrir opciones de instalación" }));
    expect(nav).toContainElement(screen.getByRole("link", { name: "Iniciar sesión" }));
  });
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
    expect(container.querySelector(".public-home__menu-timer")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByLabelText(/abrir menú/i))
      .toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector(".public-home__menu-timer")).not.toBeInTheDocument();
  });

  it("mantiene abierto el menú móvil para USER y ADMIN hasta que se cierre explícitamente", () => {
    vi.useFakeTimers();
    const { rerender } = render(<MemoryRouter><HomeHeader isAuthenticated /></MemoryRouter>);

    fireEvent.click(screen.getByLabelText(/abrir menú/i));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByLabelText(/cerrar menú/i)).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByLabelText(/cerrar menú/i));

    rerender(<MemoryRouter><HomeHeader isAuthenticated isAdmin /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText(/abrir menú/i));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByLabelText(/cerrar menú/i)).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(document.body);
    expect(screen.getByLabelText(/abrir menú/i)).toHaveAttribute("aria-expanded", "false");
  });
});
