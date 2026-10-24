import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QualityReportUseCases } from "@/core/B-application/use-cases/quality/QualityReportUseCases";
import { QualityReportsPage } from "./QualityReportsPage";

const report = { id:"first",application:"frontend",suite:"combined",generatedAt:"2026-10-24T12:00:00Z",sha:"abcdef123456",
  tests:{total:12,passed:12},coverage:{lines:{percent:60}} };
describe("Reportes privados", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(QualityReportUseCases.prototype,"catalog").mockResolvedValue({configured:true,reports:[report]} as never);
    vi.spyOn(QualityReportUseCases.prototype,"content").mockResolvedValue("<html><head></head><body>Reporte</body></html>");
  });
  it("abre el contenido autenticado dentro de un iframe sin acceso al origen de la app", async () => {
    render(<QualityReportsPage />);
    fireEvent.click(await screen.findByRole("button",{name:/Abrir reporte/}));
    const frame = await screen.findByTitle("Allure frontend");
    expect(frame).toHaveAttribute("sandbox","allow-scripts allow-downloads");
    expect(frame.getAttribute("srcdoc")).toContain("connect-src blob: data:");
    expect(frame.getAttribute("srcdoc")).not.toContain("allow-same-origin");
    expect(QualityReportUseCases.prototype.content).toHaveBeenCalledWith("first",expect.any(AbortSignal));
    expect(screen.getByText(/Líneas: 60.00/)).toBeInTheDocument();
  });
  it("distingue almacenamiento sin configurar y muestra fallos sin abrir contenido viejo", async () => {
    vi.mocked(QualityReportUseCases.prototype.catalog).mockResolvedValueOnce({configured:false,reports:[]});
    const {unmount} = render(<QualityReportsPage />);
    await screen.findByText(/cuando se configure/); unmount();
    vi.mocked(QualityReportUseCases.prototype.content).mockRejectedValueOnce(new Error("403"));
    render(<QualityReportsPage />);
    fireEvent.click(await screen.findByRole("button",{name:/Abrir reporte/}));
    await screen.findByText(/tu acceso cambió/);
    expect(screen.queryByTitle("Allure frontend")).not.toBeInTheDocument();
  });
  it("ignora respuestas del reporte anterior al cambiar de selección", async () => {
    let resolve!: (html:string) => void;
    vi.mocked(QualityReportUseCases.prototype.catalog).mockResolvedValueOnce({configured:true,reports:[report,{...report,id:"second",application:"backend"}]} as never);
    vi.mocked(QualityReportUseCases.prototype.content).mockImplementationOnce(() => new Promise(value => {resolve=value;}));
    render(<QualityReportsPage />);
    fireEvent.click(await screen.findByRole("button",{name:/Abrir reporte frontend/}));
    fireEvent.click(screen.getByRole("button",{name:/Abrir reporte backend/}));
    await screen.findByTitle("Allure backend");
    resolve("<html>anterior</html>");
    await waitFor(() => expect(screen.getByTitle("Allure backend").getAttribute("srcdoc")).not.toContain("anterior"));
  });
});
