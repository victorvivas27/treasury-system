import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchitecturePage } from "./ArchitecturePage";

const api = vi.hoisted(() => ({ catalog: vi.fn(), diagram: vi.fn() }));
vi.mock("@/presentation/hooks/architecture/useArchitectureAccess", () => ({ architectureUseCases: api }));

describe("Arquitectura integrada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.catalog.mockResolvedValue({ moduleId:"01-auth-security", title:"Seguridad", revision:"88eb6f11", generatedAt:"2026-10-09",
      diagrams:[{id:"architecture",title:"Componentes",description:"Resumen"},{id:"login",title:"Login",description:"Sesión"}] });
    api.diagram.mockResolvedValue('<!doctype html><html><head></head><body>Gráfico</body></html>');
  });

  it("carga gráficos autenticados en un iframe aislado y permite cambiar de vista", async () => {
    render(<ArchitecturePage />);
    const frame = await screen.findByTitle("Gráfico: Componentes");
    expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox");
    expect(frame).not.toHaveAttribute("src");
    expect(frame.getAttribute("srcdoc")).toContain("connect-src 'none'");
    expect(api.diagram).toHaveBeenCalledWith("architecture", expect.any(AbortSignal));
    fireEvent.click(screen.getByRole("button", { name: /Login/ }));
    await screen.findByTitle("Gráfico: Login");
    expect(api.diagram).toHaveBeenCalledWith("login", expect.any(AbortSignal));
  });

  it("quita el gráfico anterior mientras carga otro y muestra errores sin conservarlo", async () => {
    render(<ArchitecturePage />);
    await screen.findByTitle("Gráfico: Componentes");
    api.diagram.mockRejectedValueOnce(new Error("403"));
    fireEvent.click(screen.getByRole("button", { name: /Login/ }));
    await screen.findByText(/No se pudo cargar el gráfico/);
    expect(screen.queryByTitle("Gráfico: Componentes")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Gráfico: Login")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Intentar de nuevo/ }));
    await screen.findByTitle("Gráfico: Login");
  });

  it("descarta respuestas anteriores al cambiar rápidamente de vista", async () => {
    let resolveOld!: (html: string) => void;
    api.diagram.mockImplementationOnce(() => new Promise<string>(resolve => { resolveOld = resolve; }));
    render(<ArchitecturePage />);
    fireEvent.click(await screen.findByRole("button", { name: /Login/ }));
    await screen.findByTitle("Gráfico: Login");
    resolveOld('<html><head></head><body>Viejo</body></html>');
    await waitFor(() => expect(screen.getByTitle("Gráfico: Login").getAttribute("srcdoc")).not.toContain("Viejo"));
  });
});
