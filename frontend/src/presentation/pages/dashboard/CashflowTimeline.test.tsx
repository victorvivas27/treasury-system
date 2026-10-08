import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { TreasuryDashboardOverview } from "@/core/A-domain/entities/treasury/Treasury";
import { CashflowTimeline } from "./CashflowTimeline";

it("actualiza meses e importes al cambiar los datos o el año y permite recargar", () => {
  const data = { recentMovements: [
    { id: 1, type: "CUOTA", description: "Cuota familiar", amount: 400000, date: "2026-03-01", status: "ACTIVE" },
    { id: 2, type: "EGRESO", description: "Materiales", amount: 200000, date: "2026-04-01", status: "ACTIVE" },
  ] } as TreasuryDashboardOverview;
  const onRefresh = vi.fn();
  const { rerender } = render(<CashflowTimeline data={data} year={2026} loading={false} onRefresh={onRefresh} />);
  const march = within(screen.getByRole("region", { name: "marzo de 2026" }));
  expect(march.getByText("Cuotas")).toBeInTheDocument();
  expect(march.getByText("Sin egresos")).toBeInTheDocument();
  const april = within(screen.getByRole("region", { name: "abril de 2026" }));
  expect(april.getByText("Materiales")).toBeInTheDocument();
  expect(april.getByText("Sin ingresos")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "diciembre de 2026" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "enero de 2026" })).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "marzo de 2026" })).toHaveTextContent("Cuotas");
  fireEvent.click(screen.getByRole("button", { name: "Actualizar flujo" }));
  expect(onRefresh).toHaveBeenCalledOnce();
  rerender(<CashflowTimeline data={{ ...data, recentMovements: [] }} year={2026} loading={false} onRefresh={onRefresh} />);
  expect(screen.queryByText("Cuotas")).not.toBeInTheDocument();
  rerender(<CashflowTimeline data={data} year={2027} loading={true} onRefresh={onRefresh} />);
  expect(screen.queryByRole("heading", { name: "Ingresos y egresos en el tiempo" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "marzo de 2026" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Actualizar flujo" })).not.toBeInTheDocument();
});
