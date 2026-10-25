import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/presentation/context/ThemeContext";
import { Configuracion } from "./Configuracion";

describe("Configuración de apariencia", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("permite seleccionar los tres temas con controles accesibles", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><Configuracion /></ThemeProvider>);

    const dark = screen.getByRole("radio", { name: /Oscuro/ });
    const light = screen.getByRole("radio", { name: /Claro/ });
    const system = screen.getByRole("radio", { name: /Sistema/ });
    expect(dark).toBeChecked();

    await user.click(light);
    expect(light).toBeChecked();
    expect(screen.getByText(/apariencia clara y suave/i)).toBeInTheDocument();

    await user.click(system);
    expect(system).toBeChecked();
    expect(screen.getByText(/configuración de tu dispositivo/i)).toBeInTheDocument();
  });

  it("se puede operar con teclado y muestra un indicador no basado solo en color", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><Configuracion /></ThemeProvider>);

    const dark = screen.getByRole("radio", { name: /Oscuro/ });
    dark.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: /Claro/ })).toBeChecked();
    expect(screen.getByText("Seleccionado")).toBeInTheDocument();
  });

  it("ofrece cuatro paletas con previsualización y selección independiente del modo", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><Configuracion /></ThemeProvider>);
    expect(screen.getByRole("radio", { name: "Original", exact: true })).toBeChecked();
    expect(document.querySelectorAll(".palette-preview > i")).toHaveLength(32);
    await user.click(screen.getByRole("radio", { name: "Verde esmeralda y dorado", exact: true }));
    expect(localStorage.getItem("app-palette")).toBe("green-turquoise");
    expect(screen.getByRole("radio", { name: /Oscuro/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /Claro/ }));
    expect(screen.getByRole("radio", { name: "Verde esmeralda y dorado", exact: true })).toBeChecked();
  });

  it("permite cambiar paleta con flechas y anuncia la selección", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><Configuracion /></ThemeProvider>);
    screen.getByRole("radio", { name: "Original", exact: true }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Azul y lima", exact: true })).toBeChecked();
    expect(screen.getByText("Paleta activa: Azul y lima")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-palette", "blue-lime");
    expect(screen.getByRole("radio", { name: /Oscuro/ })).toBeChecked();
  });

  it("ofrece solo las tipografías definitivas y las aplica sin alterar tema ni paleta", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><Configuracion /></ThemeProvider>);
    expect(screen.getByRole("radio", { name: "Actual", exact: true })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Space Mono — Futurista", exact: true }));
    expect(screen.getByRole("radio", { name: "Space Mono — Futurista", exact: true })).toBeChecked();
    expect(screen.getByText("Tipografía activa: Space Mono — Futurista")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-font-family", "space-mono");
    expect(document.querySelectorAll(".font-family-selector input[type=radio]")).toHaveLength(4);
    expect(document.querySelectorAll(".font-family-option__sample")).toHaveLength(4);
    expect(screen.queryByRole("radio", { name: "Inter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Roboto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Poppins" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Original", exact: true })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Oscuro/ })).toBeChecked();
  });
});
