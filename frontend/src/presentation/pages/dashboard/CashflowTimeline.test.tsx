import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { TreasuryDashboardOverview } from "@/core/A-domain/entities/treasury/Treasury";
import { CashflowTimeline } from "./CashflowTimeline";

it("mantiene la gráfica mínima y muestra todos los conceptos y el balance en el modal", () => {
  const recentMovements = Array.from({ length: 5 }, (_, index) => [
    { id: index * 2, type: "INGRESO", description: `Ingreso ${index + 1}`, amount: (index + 1) * 1000, date: "2026-03-01", status: "ACTIVE" },
    { id: index * 2 + 1, type: "EGRESO", description: `Egreso ${index + 1}`, amount: 500, date: "2026-03-02", status: "ACTIVE" },
  ]).flat();
  const data = { recentMovements } as TreasuryDashboardOverview;
  render(<CashflowTimeline data={data} year={2026} loading={false} onRefresh={vi.fn()} />, { wrapper: MemoryRouter });
  const month = screen.getByRole("region", { name: "marzo de 2026" });
  expect(month.querySelectorAll("li")).toHaveLength(0);
  expect(within(month).queryByText("Balance")).not.toBeInTheDocument();
  fireEvent.click(within(month).getByRole("button", { name: "Ver movimientos de marzo de 2026" }));
  const dialog = screen.getByRole("dialog", { name: "marzo de 2026" });
  expect(dialog.querySelectorAll("dl > div")).toHaveLength(10);
  expect(within(dialog).getByText("$12.500")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar detalle mensual" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("actualiza meses e importes al cambiar los datos o el año y permite recargar", () => {
  const data = { recentMovements: [
    { id: 1, type: "CUOTA", description: "Cuota familiar", amount: 400000, date: "2026-03-01", status: "ACTIVE" },
    { id: 2, type: "EGRESO", description: "Materiales", amount: 200000, date: "2026-04-01", status: "ACTIVE" },
  ] } as TreasuryDashboardOverview;
  const onRefresh = vi.fn();
  const { rerender } = render(<CashflowTimeline data={data} year={2026} loading={false} onRefresh={onRefresh} />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /^Ingresos/ })).toHaveAttribute("href", "/tesoreria/ingresos?year=2026");
  expect(screen.getByRole("link", { name: /^Egresos/ })).toHaveAttribute("href", "/tesoreria/gastos?year=2026");
  const scrollIntoView = vi.fn();
  const balance = screen.getByRole("button", { name: "Ver movimientos de marzo de 2026" });
  balance.scrollIntoView = scrollIntoView;
  fireEvent.click(screen.getByRole("button", { name: /^Balance anual/ }));
  expect(scrollIntoView).toHaveBeenCalledOnce();
  expect(balance).toHaveFocus();
  const march = within(screen.getByRole("region", { name: "marzo de 2026" }));
  expect(march.queryByText("Cuotas")).not.toBeInTheDocument();
  expect(march.getByText("Sin egresos")).toBeInTheDocument();
  const marchDetails = march.getByRole("button", { name: "Ver movimientos de marzo de 2026" });
  marchDetails.focus();
  fireEvent.click(marchDetails);
  const dialog = within(screen.getByRole("dialog", { name: "marzo de 2026" }));
  expect(dialog.getByText("Cuotas")).toBeInTheDocument();
  expect(dialog.getByText("Balance del mes")).toBeInTheDocument();
  expect(document.body.style.overflow).not.toBe("hidden");
  expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(marchDetails).toHaveFocus();
  const april = within(screen.getByRole("region", { name: "abril de 2026" }));
  expect(april.queryByText("Materiales")).not.toBeInTheDocument();
  expect(april.getByText("Sin ingresos")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "diciembre de 2026" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "enero de 2026" })).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "marzo de 2026" })).not.toHaveTextContent("Balance");
  fireEvent.click(screen.getByRole("button", { name: "Actualizar flujo" }));
  expect(onRefresh).toHaveBeenCalledOnce();
  rerender(<CashflowTimeline data={{ ...data, recentMovements: [] }} year={2026} loading={false} onRefresh={onRefresh} />);
  expect(screen.queryByText("Cuotas")).not.toBeInTheDocument();
  rerender(<CashflowTimeline data={data} year={2027} loading={true} onRefresh={onRefresh} />);
  expect(screen.queryByRole("heading", { name: "Ingresos y egresos en el tiempo" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "marzo de 2026" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Actualizar flujo" })).not.toBeInTheDocument();
});
