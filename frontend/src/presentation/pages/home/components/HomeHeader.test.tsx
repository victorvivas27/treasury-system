import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomeHeader } from "./HomeHeader";

describe("HomeHeader", () => {
  it("muestra la navegación de la comunidad para una sesión autenticada", () => {
    render(<MemoryRouter><HomeHeader isAuthenticated /></MemoryRouter>);

    expect(screen.getByRole("link", { name: "Sobre nosotros" }))
      .toHaveAttribute("href", "#sobre-nosotros");
    expect(screen.getByRole("link", { name: "Fotos del curso" }))
      .toHaveAttribute("href", "#fotos-del-curso");
    expect(screen.getByRole("link", { name: "Contacto" })).toHaveAttribute("href", "#contacto");
    expect(screen.getByRole("link", { name: "Directiva" })).toHaveAttribute("href", "#directiva");
    expect(screen.getByRole("link", { name: /ir al sistema/i }))
      .toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  it("envía al administrador al CRUD de Sobre nosotros", () => {
    render(<MemoryRouter><HomeHeader isAuthenticated isAdmin /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /administrar sobre nosotros/i }))
      .toHaveAttribute("href", "/admin/sobre-nosotros");
  });
});
