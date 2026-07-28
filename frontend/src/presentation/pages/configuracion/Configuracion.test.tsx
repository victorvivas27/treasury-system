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
});
