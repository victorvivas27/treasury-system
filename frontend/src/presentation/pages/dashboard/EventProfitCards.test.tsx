import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventProfitCards } from "./EventProfitCards";
import { MemoryRouter } from "react-router-dom";

const { eventProfits } = vi.hoisted(() => ({ eventProfits: vi.fn() }));
vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({
  TreasuryRepositoryImpl: vi.fn().mockImplementation(function () { return { eventProfits }; }),
}));

describe("EventProfitCards", () => {
  beforeEach(() => vi.resetAllMocks());

  it("muestra las dos ganancias con sus títulos, iconos y montos independientes", async () => {
    eventProfits.mockResolvedValue([
      { id: 1, name: "Fiesta de la Familia — Completos", eventDate: "2026-08-15", netProfit: 125000 },
      { id: 2, name: "Fiesta de la Familia — Juegos", eventDate: "2026-09-05", netProfit: 86000 },
    ]);
    render(<MemoryRouter><EventProfitCards year={2026} /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando ganancias");
    const first = await screen.findByRole("article", { name: "Fiesta de la Familia — Completos" });
    const second = screen.getByRole("article", { name: "Fiesta de la Familia — Juegos" });
    expect(within(first).getByText("$125.000")).toBeInTheDocument();
    expect(within(second).getByText("$86.000")).toBeInTheDocument();
    expect(first.querySelector("svg")).toBeInTheDocument();
    expect(second).toHaveTextContent("Ganancia neta del curso");
    expect(within(first).getByRole("link")).toHaveAttribute("href",
      "/tesoreria/stands?year=2026&eventId=1&tab=summary");
    expect(within(second).getByRole("link")).toHaveAttribute("href",
      "/tesoreria/stands?year=2026&eventId=2&tab=summary");
    expect(eventProfits).toHaveBeenCalledWith(2026);
  });

  it("consulta el nuevo año y no muestra las ganancias anteriores", async () => {
    eventProfits.mockResolvedValueOnce([
      { id: 1, name: "Fiesta anterior", eventDate: "2026-08-15", netProfit: 1000 },
    ]).mockResolvedValueOnce([]);
    const { rerender } = render(<MemoryRouter><EventProfitCards key={2026} year={2026} /></MemoryRouter>);
    await screen.findByText("Fiesta anterior");
    rerender(<MemoryRouter><EventProfitCards key={2027} year={2027} /></MemoryRouter>);
    expect(screen.queryByText("Fiesta anterior")).not.toBeInTheDocument();
    await screen.findByText("No hay eventos con distribución confirmada en 2027.");
    expect(eventProfits).toHaveBeenLastCalledWith(2027);
  });

  it("permite reintentar una consulta fallida sin mostrar montos inventados", async () => {
    eventProfits.mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValueOnce([]);
    render(<MemoryRouter><EventProfitCards year={2026} /></MemoryRouter>);
    await screen.findByRole("alert");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    await screen.findByText("No hay eventos con distribución confirmada en 2026.");
  });
});
