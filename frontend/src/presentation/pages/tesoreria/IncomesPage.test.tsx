import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncomesPage } from "./IncomesPage";

const { repository, account } = vi.hoisted(() => ({
  repository: { listIncomes: vi.fn(), dashboardOverview: vi.fn(), getManagedCourse: vi.fn(), listIncomeDocuments: vi.fn(), uploadIncomeDocuments: vi.fn() },
  account: { rol: "ADMIN" },
}));
vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: () => ({ user: account }) }));
vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({ TreasuryRepositoryImpl: vi.fn().mockImplementation(function () { return repository; }) }));

describe("IncomesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    account.rol = "ADMIN";
    repository.getManagedCourse.mockResolvedValue("1A");
    repository.listIncomeDocuments.mockResolvedValue([]);
    repository.uploadIncomeDocuments.mockResolvedValue(undefined);
    repository.listIncomes.mockResolvedValue([{ id: 1, description: "Rifa del curso", amount: 30000, incomeDate: "2026-10-19", status: "ACTIVE", category: "RAFFLE", registeredBy: "Tesorería", createdAt: "2026-10-19T12:00:00" }]);
    repository.dashboardOverview.mockResolvedValue({ finances: { schoolYear: 2026, feeIncome: 70000, otherIncome: 30000, totalIncome: 100000, totalExpenses: 20000, availableBalance: 80000 }, recentMovements: [{ id: 2, type: "CUOTA", amount: 35000, date: "2026-10-18", description: "Cuota de Sofía" }] });
  });

  it("shows fees and other income together, with a selector filtering the shared list", async () => {
    render(<MemoryRouter><IncomesPage /></MemoryRouter>);
    await screen.findByText("Rifa del curso");
    expect(screen.getByText("Cuota de Sofía")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Tipo de ingreso" }), { target: { value: "FEES" } });
    expect(screen.queryByText("Rifa del curso")).not.toBeInTheDocument();
    expect(screen.getByText("Cuota de Sofía")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Tipo de ingreso" }), { target: { value: "OTHER" } });
    expect(screen.getByText("Rifa del curso")).toBeInTheDocument();
    expect(screen.queryByText("Cuota de Sofía")).not.toBeInTheDocument();
  });

  it("locks background scrolling while filtering and restores it on Escape", async () => {
    render(<MemoryRouter><IncomesPage /></MemoryRouter>);
    await screen.findByText("Rifa del curso");
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("does not offer registration to a regular user", async () => {
    account.rol = "USER";
    render(<MemoryRouter><IncomesPage /></MemoryRouter>);
    await screen.findByText("Rifa del curso");
    expect(screen.queryByRole("button", { name: "Registrar ingreso" })).not.toBeInTheDocument();
    expect(repository.getManagedCourse).not.toHaveBeenCalled();
  });

  it("allows attaching a receipt directly from the event income detail", async () => {
    const records = await repository.listIncomes();
    repository.listIncomes.mockResolvedValue([{ ...records[0], description: "Ganancia Fiesta de la Familia" }]);
    render(<MemoryRouter><IncomesPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Ver detalle de Ganancia Fiesta de la Familia" }));
    const input = screen.getByLabelText("Adjuntar comprobante");
    const receipt = new File(["prueba"], "comprobante.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [receipt] } });
    await waitFor(() => expect(repository.uploadIncomeDocuments).toHaveBeenCalledWith(1, [receipt]));
  });

  it("keeps all 48 fee payments accessible in sixteen pages of three", async () => {
    repository.listIncomes.mockResolvedValue([]);
    const overview = await repository.dashboardOverview();
    repository.dashboardOverview.mockResolvedValue({ ...overview, recentMovements: Array.from({ length: 48 }, (_, index) => ({ id: index + 1, type: "CUOTA", amount: 35000, date: "2026-10-19", description: `Pago familiar ${index + 1}` })) });
    render(<MemoryRouter><IncomesPage /></MemoryRouter>);
    const fees = await screen.findByRole("region", { name: "Listado de ingresos" });
    expect(within(fees).getByText("48 ingresos")).toBeInTheDocument();
    const pagination = within(fees).getByRole("navigation", { name: "Paginación de ingresos" });
    expect(within(pagination).getByRole("button", { name: /Anterior/ })).toBeDisabled();
    const seen = new Set<string>();
    for (let page = 1; page <= 16; page++) {
      expect(within(pagination).getByText(`Página ${page} de 16`)).toBeInTheDocument();
      const cards = within(fees).getAllByRole("article");
      expect(cards).toHaveLength(3);
      cards.forEach(card => seen.add(card.querySelector("h2")!.textContent!));
      if (page < 16) fireEvent.click(within(pagination).getByRole("button", { name: /Siguiente/ }));
    }
    expect(seen.size).toBe(48);
    expect(within(pagination).getByRole("button", { name: /Siguiente/ })).toBeDisabled();
    fireEvent.click(within(pagination).getByRole("button", { name: /Anterior/ }));
    expect(within(fees).getByText("Pago familiar 43")).toBeInTheDocument();
  });
});
