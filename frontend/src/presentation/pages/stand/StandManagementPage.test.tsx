import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { StandManagementPage } from "./StandManagementPage";

const { listEvents, list, loadStandPanelData } = vi.hoisted(() => ({
  listEvents: vi.fn(), list: vi.fn(), loadStandPanelData: vi.fn(),
}));
vi.mock("@/presentation/context/AuthContext", () => ({
  useAuth: () => ({ user: { rol: "ADMIN" } }),
}));
vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({
  TreasuryRepositoryImpl: vi.fn().mockImplementation(function () { return { listEvents }; }),
}));
vi.mock("@/core/B-application/use-cases/stand/StandUseCases", () => ({
  StandUseCases: vi.fn().mockImplementation(function () { return { list }; }),
}));
vi.mock("./standPanelData", () => ({ loadStandPanelData }));

describe("StandManagementPage navigation", () => {
  it("abre el evento indicado por el dashboard en la pestaña Resumen", async () => {
    listEvents.mockResolvedValue([
      { id: 1, name: "Otro evento", eventDate: "2027-01-01" },
      { id: 2, name: "Fiesta de la Familia", eventDate: "2027-09-07" },
    ]);
    list.mockResolvedValue([{
      id: 20, eventId: 2, name: "Pizza", status: "CLOSED", responsible: "Curso",
      date: "2027-09-07", startTime: "10:00", endTime: "18:00", paymentMethods: [],
    }]);
    loadStandPanelData.mockResolvedValue({});
    render(<MemoryRouter initialEntries={["/tesoreria/stands?year=2027&eventId=2&tab=summary"]}>
      <StandManagementPage />
    </MemoryRouter>);
    await waitFor(() => expect(list).toHaveBeenCalledWith(2));
    expect(listEvents).toHaveBeenCalledWith(2027);
    expect(list).not.toHaveBeenCalledWith(1);
    expect(await screen.findByRole("button", { name: "Resumen" })).toHaveClass("is-active");
    await waitFor(() => expect(loadStandPanelData)
      .toHaveBeenCalledWith(expect.anything(), 20, "summary", false));
    expect(screen.getByRole("heading", { name: "Ventas del stand" }).closest("details")).toBeNull();
    fireEvent.click(screen.getByText("Datos del stand"));
    expect(screen.getByRole("button", { name: "Crear stand" }).closest("details"))
      .toHaveClass("stand-workspace__overview");
    expect(screen.getByRole("button", { name: "Recargar" }).closest("details"))
      .toHaveClass("stand-workspace__overview");
    expect(screen.getByRole("button", { name: /Evento seleccionado Fiesta de la Familia/ }))
      .toHaveTextContent("Cerrado Pizza");
    expect(screen.getByRole("button", { name: /Evento seleccionado Fiesta de la Familia/ }))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver evento Otro evento/ }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(1));
    expect(screen.getByRole("button", { name: /Evento seleccionado Otro evento/ }))
      .toHaveAttribute("aria-pressed", "true");
    listEvents.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: "Año siguiente" }));
    await waitFor(() => expect(listEvents).toHaveBeenLastCalledWith(2028));
    expect(await screen.findByText("No hay eventos en 2028.")).toBeInTheDocument();
  });
});
