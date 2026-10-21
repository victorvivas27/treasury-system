import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpensesPage } from "./ExpensesPage";
import { clearExpensesCache } from "./expensesCache";

const { repository, account } = vi.hoisted(() => ({
  repository: { listExpenses: vi.fn(), financialSummary: vi.fn(), listExpenseDocuments: vi.fn(), uploadExpenseDocuments: vi.fn(), createExpense: vi.fn() },
  account: { rol: "ADMIN" },
}));
vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: () => ({ user: account }) }));
vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({ TreasuryRepositoryImpl: vi.fn().mockImplementation(function () { return repository; }) }));

describe("ExpensesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearExpensesCache();
    account.rol = "ADMIN";
    repository.listExpenses.mockResolvedValue(Array.from({ length: 8 }, (_, index) => ({ id: index + 1, description: `Compra del curso ${index + 1}`, amount: 15000, expenseDate: "2026-10-19", status: "ACTIVE", category: "MATERIALS", registeredBy: "Tesorería", createdAt: "2026-10-19T12:00:00" })));
    repository.financialSummary.mockResolvedValue({ schoolYear: 2026, totalIncome: 150000, totalExpenses: 120000, availableBalance: 30000 });
    repository.listExpenseDocuments.mockResolvedValue([]);
    repository.uploadExpenseDocuments.mockResolvedValue(undefined);
  });

  it("shares the initial loader and reuses data on return", async () => {
    const first = render(<MemoryRouter><ExpensesPage /></MemoryRouter>);
    expect(screen.getByRole("status", { name: "Preparando los egresos" })).toBeInTheDocument();
    expect(document.querySelector(".skeleton-block")).toBeNull();
    await screen.findByText("Compra del curso 1");
    first.unmount();
    render(<MemoryRouter><ExpensesPage /></MemoryRouter>);
    expect(screen.getByText("Compra del curso 1")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Preparando los egresos" })).not.toBeInTheDocument();
    expect(repository.listExpenses).toHaveBeenCalledTimes(1);
    expect(repository.financialSummary).toHaveBeenCalledTimes(1);
  });

  it("retries a failed load without showing a misleading empty state", async () => {
    repository.listExpenses.mockRejectedValueOnce(new Error("offline"));
    render(<MemoryRouter><ExpensesPage /></MemoryRouter>);
    await screen.findByRole("alert");
    expect(screen.queryByText("No hay egresos para los filtros seleccionados.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByText("Compra del curso 1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reloads the list and totals after registering an expense", async () => {
    render(<MemoryRouter><ExpensesPage /></MemoryRouter>);
    await screen.findByText("Compra del curso 1");
    repository.createExpense.mockResolvedValue({});
    repository.listExpenses.mockResolvedValue([{ id: 10, description: "Material nuevo", amount: 5000, expenseDate: "2026-10-21", status: "ACTIVE", registeredBy: "Admin" }]);
    fireEvent.click(screen.getByRole("button", { name: "Registrar egreso" }));
    fireEvent.change(screen.getByLabelText("Descripción del egreso *"), { target: { value: "Material nuevo" } });
    fireEvent.change(screen.getByLabelText("Monto *"), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar egreso" }));
    await screen.findByText("Material nuevo");
    expect(repository.createExpense).toHaveBeenCalledWith(expect.objectContaining({ description: "Material nuevo", amount: 5000 }));
    expect(repository.financialSummary).toHaveBeenCalledTimes(2);
  });

  it("paginates three expenses and preserves one empty slot on the final page", async () => {
    render(<MemoryRouter><ExpensesPage /></MemoryRouter>);
    const results = await screen.findByRole("region", { name: "Listado de egresos" });
    expect(within(results).getAllByRole("article")).toHaveLength(3);
    expect(within(results).queryByText("Activo")).not.toBeInTheDocument();
    fireEvent.click(within(results).getByRole("button", { name: /Siguiente/ }));
    expect(within(results).getAllByRole("article")).toHaveLength(3);
    fireEvent.click(within(results).getByRole("button", { name: /Siguiente/ }));
    expect(within(results).getAllByRole("article")).toHaveLength(2);
    expect(results.querySelectorAll(".expense-card-placeholder")).toHaveLength(1);
    expect(within(results).getByText("Compra del curso 8")).toBeInTheDocument();
    fireEvent.click(within(results).getByRole("button", { name: /Anterior/ }));
    fireEvent.click(within(results).getByRole("button", { name: /Anterior/ }));
    expect(within(results).getByText("Compra del curso 1")).toBeInTheDocument();
  });

  it("allows admins to attach a receipt from the detail and locks background scrolling", async () => {
    render(<MemoryRouter><ExpensesPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Ver detalle de Compra del curso 1" }));
    expect(document.body.style.overflow).toBe("hidden");
    const receipt = new File(["prueba"], "comprobante.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Adjuntar comprobante"), { target: { files: [receipt] } });
    await waitFor(() => expect(repository.uploadExpenseDocuments).toHaveBeenCalledWith(1, [receipt]));
  });

  it("lets regular users read details without registration or upload controls", async () => {
    account.rol = "USER";
    render(<MemoryRouter><ExpensesPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Ver detalle de Compra del curso 1" }));
    expect(screen.queryByRole("button", { name: "Registrar egreso" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Adjuntar comprobante")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
