import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeDashboardPreview } from "./HomeDashboardPreview";

describe("HomeDashboardPreview", () => {
  it("permite explorar los detalles y mantiene un solo panel abierto", () => {
    render(<HomeDashboardPreview />);
    const annual = screen.getByRole("button", { name: "Cuota anual" });
    const contributions = screen.getByRole("button", { name: "Aportes del curso" });
    expect(annual).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(annual);
    expect(annual).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("$1.500.000 de $1.920.000")).toBeVisible();
    fireEvent.click(contributions);
    expect(annual).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("$1.500.000 de $1.920.000")).not.toBeVisible();
    expect(screen.getByText("Cuota CEPA")).toBeVisible();
    fireEvent.click(contributions);
    expect(contributions).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Cuota CEPA")).not.toBeVisible();
  });

  it("identifica los datos ficticios y representa los grupos del dashboard real", () => {
    render(<HomeDashboardPreview />);
    expect(screen.getByText("Vista previa · Datos ficticios")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Dinero del curso" })).getByText("Egresos activos")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Cuotas del curso" })).getByText("Cuotas pagadas")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ingresos y egresos en el tiempo" })).toBeVisible();
    expect(screen.getByText("Alumnos activos")).toBeVisible();
    expect(screen.getByText("Próximo cumpleaños")).toBeVisible();
    expect(screen.getByText("Balance anual")).toBeVisible();
    expect(document.querySelectorAll(".home-dashboard__cashflow .flow-ribbon-station")).toHaveLength(3);
    const flow = within(screen.getByRole("region", { name: "Ingresos y egresos en el tiempo" }));
    expect(flow.queryByText("Insumos kermés")).not.toBeInTheDocument();
    fireEvent.click(flow.getByRole("button", { name: /Ver movimientos de Marzo/ }));
    expect(within(screen.getByRole("dialog")).getByText("Insumos kermés")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle mensual" }));
    expect(document.querySelector(".home-dashboard__bars")).toBeNull();
  });
});
