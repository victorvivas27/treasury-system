import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/D-config/api";
import { TreasuryRepositoryImpl } from "./TreasuryRepositoryImpl";

vi.mock("@/core/D-config/api", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

describe("TreasuryRepositoryImpl", () => {
  let repository: TreasuryRepositoryImpl;
  beforeEach(() => {
    repository = new TreasuryRepositoryImpl();
    vi.clearAllMocks();
  });

  it("[Tesorería repository #01] guarda la configuración anual", async () => {
    const payload = {
      annualAmount: 70000, allowedMode: "AMBAS" as const,
      annualDueDate: "2026-04-15", firstDueDate: "2026-04-15",
      secondDueDate: "2026-07-15",
    };
    vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 1, year: 2026, ...payload } });

    await repository.saveConfig(2026, payload);

    expect(apiClient.put).toHaveBeenCalledWith("/tesoreria/configuraciones/2026", payload);
  });

  it("[Tesorería repository #02] genera obligaciones y retorna la cantidad", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { generated: 4 } });

    expect(await repository.generate(2026)).toBe(4);
    expect(apiClient.post).toHaveBeenCalledWith("/tesoreria/obligaciones/generar/2026");
  });

  it("[Tesorería repository #03] envía filtros al listar obligaciones", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    await repository.listObligations(2026, { course: "4A", status: "PENDIENTE" });

    expect(apiClient.get).toHaveBeenCalledWith("/tesoreria/obligaciones", {
      params: { year: 2026, course: "4A", status: "PENDIENTE" },
    });
  });

  it("[Tesorería repository #04] registra y anula pagos sin eliminarlos", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await repository.pay(8, "2026-04-15", 70000, "Transferencia");
    await repository.annul(8, "Pago ingresado por error");

    expect(apiClient.post).toHaveBeenNthCalledWith(1, "/tesoreria/obligaciones/8/pagos",
      { paymentDate: "2026-04-15", amount: 70000, observations: "Transferencia" });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, "/tesoreria/obligaciones/8/anulacion",
      { reason: "Pago ingresado por error" });
  });
  it("[Tesoreria repository #05] lista aportes con filtros independientes", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    await repository.listContributions(2026, {
      course: "4A", cepaStatus: "PAID", solidarityStatus: "PENDING",
    });

    expect(apiClient.get).toHaveBeenCalledWith("/tesoreria/aportes", {
      params: {
        year: 2026, course: "4A", cepaStatus: "PAID", solidarityStatus: "PENDING",
      },
    });
  });

  it("[Tesoreria repository #06] registra CEPA y anula sin eliminar", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });

    await repository.payContribution(12, 2026, "CEPA", "2026-04-10", "Transferencia");
    await repository.cancelContribution(9, "Familia equivocada");

    expect(apiClient.post).toHaveBeenCalledWith("/tesoreria/aportes/12/pagos", {
      schoolYear: 2026, contributionType: "CEPA",
      paymentDate: "2026-04-10", notes: "Transferencia",
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/tesoreria/aportes/9/anulacion",
      { reason: "Familia equivocada" });
  });

  it("[Tesoreria repository #07] lista egresos con filtros", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    await repository.listExpenses(2026, {
      category: "MATERIALS", status: "ACTIVE", sort: "AMOUNT_DESC",
    });

    expect(apiClient.get).toHaveBeenCalledWith("/tesoreria/egresos", {
      params: {
        year: 2026, category: "MATERIALS", status: "ACTIVE", sort: "AMOUNT_DESC",
      },
    });
  });

  it("[Tesoreria repository #08] registra y anula egresos", async () => {
    const payload = {
      schoolYear: 2026, description: "Materiales", amount: 45000,
      expenseDate: "2026-07-15", category: "MATERIALS" as const,
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 1, ...payload } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });

    await repository.createExpense(payload);
    await repository.cancelExpense(1, "Duplicado");

    expect(apiClient.post).toHaveBeenCalledWith("/tesoreria/egresos", payload);
    expect(apiClient.patch).toHaveBeenCalledWith("/tesoreria/egresos/1/anulacion",
      { reason: "Duplicado" });
  });

  it("[Tesoreria repository #09] lista ingresos extraordinarios con filtros", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    await repository.listIncomes(2026, {
      category: "RAFFLE", status: "ACTIVE", sort: "DATE_DESC",
    });

    expect(apiClient.get).toHaveBeenCalledWith("/tesoreria/ingresos", {
      params: { year: 2026, category: "RAFFLE", status: "ACTIVE", sort: "DATE_DESC" },
    });
  });

  it("[Tesoreria repository #10] registra y anula ingresos extraordinarios", async () => {
    const payload = {
      schoolYear: 2026, description: "Rifa escolar", amount: 150000,
      incomeDate: "2026-07-20", category: "RAFFLE" as const,
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 1, ...payload } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });

    await repository.createIncome(payload);
    await repository.cancelIncome(1, "Duplicado");

    expect(apiClient.post).toHaveBeenCalledWith("/tesoreria/ingresos", payload);
    expect(apiClient.patch).toHaveBeenCalledWith("/tesoreria/ingresos/1/anulacion",
      { reason: "Duplicado" });
  });
});
