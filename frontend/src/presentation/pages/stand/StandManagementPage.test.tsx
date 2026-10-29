import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StandManagementPage } from "./StandManagementPage";
import { clearStandCache } from "./standCache";

const { listEvents, list, loadStandPanelData, account } = vi.hoisted(() => ({
  listEvents: vi.fn(), list: vi.fn(), loadStandPanelData: vi.fn(), account: { rol: "ADMIN" },
}));
vi.mock("@/presentation/context/AuthContext", () => ({
  useAuth: () => ({ user: account }),
}));
vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({
  TreasuryRepositoryImpl: vi.fn().mockImplementation(function () { return { listEvents, listEventOptions: listEvents }; }),
}));
vi.mock("@/core/B-application/use-cases/stand/StandUseCases", () => ({
  StandUseCases: vi.fn().mockImplementation(function () { return { list }; }),
}));
vi.mock("./standPanelData", () => ({ loadStandPanelData }));

describe("StandManagementPage navigation", () => {
  beforeEach(() => { clearStandCache(); vi.clearAllMocks(); account.rol = "ADMIN"; });
  it("loads only the summary for a regular user and reuses it on return", async () => {
    account.rol = "USER";
    listEvents.mockResolvedValue([{ id: 1, name: "Fiesta", eventDate: "2026-10-21" }]);
    list.mockResolvedValue([{ id: 10, eventId: 1, name: "Pizza", status: "CLOSED", responsible: "Curso", date: "2026-10-21", startTime: "10:00", endTime: "18:00" }]);
    loadStandPanelData.mockResolvedValue({ summary: { initialFund: 0, totalSold: 0, expectedCash: 0, totalCost: 0, netProfit: 0,
      salesByPaymentMethod: {}, salesByProduct: [], salesByVariant: {}, unitsByPresentation: {}, stockAlerts: [] } });
    const first = render(<MemoryRouter><StandManagementPage /></MemoryRouter>);
    await screen.findByText("Totales del stand");
    await waitFor(() => expect(screen.queryByRole("status", { name: "Cargando datos del stand" })).not.toBeInTheDocument());
    expect(loadStandPanelData).toHaveBeenCalledWith(expect.anything(), 10, "summary", true);
    expect(screen.queryByRole("button", { name: "Crear stand" })).not.toBeInTheDocument();
    first.unmount();
    render(<MemoryRouter><StandManagementPage /></MemoryRouter>);
    expect(screen.queryByRole("status", { name: "Cargando datos del stand" })).not.toBeInTheDocument();
    await waitFor(() => expect(loadStandPanelData).toHaveBeenCalledTimes(1));
  });
  it("reuses the selected event, stand and panel after returning", async () => {
    listEvents.mockResolvedValue([{ id: 1, name: "Evento", eventDate: "2026-10-21" }]);
    list.mockResolvedValue([{ id: 10, eventId: 1, name: "Pizza", status: "OPEN", responsible: "Curso", date: "2026-10-21", startTime: "10:00", endTime: "18:00" }]);
    loadStandPanelData.mockResolvedValue({ products: [] });
    const first = render(<MemoryRouter><StandManagementPage /></MemoryRouter>);
    expect(screen.getByRole("status", { name: "Cargando datos del stand" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("status", { name: "Cargando datos del stand" })).not.toBeInTheDocument());
    first.unmount();
    render(<MemoryRouter><StandManagementPage /></MemoryRouter>);
    expect(screen.queryByRole("status", { name: "Cargando datos del stand" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Evento/ })).toBeChecked();
    await waitFor(() => expect(listEvents).toHaveBeenCalledTimes(1));
    expect(list).toHaveBeenCalledTimes(1);
    expect(loadStandPanelData).toHaveBeenCalledTimes(1);
  });

  it("ends the loader on failure and retries the initial request", async () => {
    listEvents.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
    render(<MemoryRouter><StandManagementPage /></MemoryRouter>);
    await screen.findByRole("alert");
    expect(screen.queryByRole("status", { name: "Cargando datos del stand" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByText("Primero crea un evento");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("abre el evento indicado por el dashboard en la pestaña Resumen", async () => {
    listEvents.mockResolvedValue([
      { id: 2, name: "Fiesta de la Familia", eventDate: "2027-09-07" },
      { id: 1, name: "Otro evento", eventDate: "2027-01-01" },
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
    expect(screen.getAllByRole("radio")[0]).toHaveAccessibleName(/Otro evento/);
    expect(screen.getAllByRole("radio")[1]).toHaveAccessibleName(/Fiesta de la Familia/);
    const selectedEvent = screen.getByRole("radio", { name: /Fiesta de la Familia/ });
    expect(selectedEvent).toBeChecked();
    expect(document.querySelector(".stand-event-meta")).toHaveTextContent("CerradoPizza");
    fireEvent.click(screen.getByRole("radio", { name: /Otro evento/ }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(1));
    expect(screen.getByRole("radio", { name: /Otro evento/ })).toBeChecked();
    listEvents.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: "Año siguiente" }));
    await waitFor(() => expect(listEvents).toHaveBeenLastCalledWith(2028));
    expect(await screen.findByText("No hay eventos en 2028.")).toBeInTheDocument();
  });
});
