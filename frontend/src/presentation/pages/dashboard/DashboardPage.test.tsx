import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

const { dashboardOverview, contributionSummary, currentUser } = vi.hoisted(() => ({
  dashboardOverview: vi.fn(), contributionSummary: vi.fn(),
  currentUser: { rol: "ADMIN" },
}));

vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({
  TreasuryRepositoryImpl: vi.fn().mockImplementation(function () {
    return { dashboardOverview, contributionSummary };
  }),
}));

vi.mock("@/presentation/context/AuthContext", () => ({
  useOptionalAuth: () => ({ user: currentUser }),
}));

const overview = {
  quotas: {
    totalFamilies: 3, annualFamilies: 2, twoInstallmentFamilies: 1,
    pendingObligations: 2, paidObligations: 4, collectedAmount: 140000, pendingAmount: 70000,
  },
  finances: {
    schoolYear: 2026, feeIncome: 140000, otherIncome: 100000,
    totalIncome: 240000, totalExpenses: 30000, availableBalance: 210000,
  },
  monthlyCashFlow: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1, income: index === 6 ? 100000 : 0, expense: index === 6 ? 30000 : 0,
  })),
  obligationStatus: [{ status: "PAGADA", count: 4 }, { status: "PENDIENTE", count: 2 }],
  expensesByCategory: [{ category: "MATERIALS", amount: 30000 }],
  expensesByDescription: [
    { id: 1, description: "Colaciones reunión", category: "FOOD", amount: 20000 },
    { id: 2, description: "Cartulinas", category: "MATERIALS", amount: 10000 },
  ],
  recentMovements: [{
    id: 1, type: "INGRESO", description: "Rifa escolar", amount: 100000,
    date: "2026-07-20", status: "ACTIVE",
  }],
  auditTrail: [],
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.rol = "ADMIN";
  });

  it("[DashboardPage #01] muestra skeleton y luego métricas y actividad reales", async () => {
    dashboardOverview.mockResolvedValue(overview);
    contributionSummary.mockResolvedValue({
      totalFamilies: 4, cepaPaid: 3, cepaPending: 1,
      solidarityPaid: 2, solidarityPending: 2, fullyPaid: 2, withPending: 2,
    });
    const { container } = render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByLabelText("Cargando dashboard")).toBeInTheDocument();
    expect(container.querySelectorAll(".skeleton-block").length).toBeGreaterThan(0);

    await waitFor(() => expect(screen.getByText("$240.000")).toBeInTheDocument());
    expect(screen.getByText("Rifa escolar")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir" }))
      .toHaveAttribute("href", "/tesoreria/ingresos");
  });

  it("muestra la actividad y oculta las trazas al usuario común", async () => {
    currentUser.rol = "USER";
    dashboardOverview.mockResolvedValue(overview);
    contributionSummary.mockResolvedValue({
      totalFamilies: 4, cepaPaid: 3, cepaPending: 1,
      solidarityPaid: 2, solidarityPending: 2, fullyPaid: 2, withPending: 2,
    });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText("$240.000")).toBeInTheDocument());
    expect(screen.getByText("Actividad reciente")).toBeInTheDocument();
    expect(screen.getByText("Rifa escolar")).toBeInTheDocument();
    expect(screen.queryByText("Trazas de Tesorería")).not.toBeInTheDocument();
    expect(screen.getByText("Modalidad y avance de recaudación")).toBeInTheDocument();
    expect(screen.getByText("Cuota única")).toBeInTheDocument();
    expect(screen.getByText("Dos cuotas")).toBeInTheDocument();
    expect(screen.getByText("$140.000 de $210.000")).toBeInTheDocument();
    expect(screen.getByText("67% recaudado")).toBeInTheDocument();
    expect(screen.getByText("4 de 6 cuotas pagadas")).toBeInTheDocument();
    expect(screen.getByText("¿En qué se gastó?")).toBeInTheDocument();
    expect(screen.getByText("Colaciones reunión")).toBeInTheDocument();
    expect(screen.getByText("Alimentación")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Avance de recaudación" }))
      .toHaveAttribute("aria-valuenow", "67");
  });

  it("pagina la actividad reciente de cinco en cinco", async () => {
    dashboardOverview.mockResolvedValue({
      ...overview,
      recentMovements: Array.from({ length: 6 }, (_, index) => ({
        id: index + 1,
        type: index === 5 ? "CUOTA" : "INGRESO",
        description: `Movimiento ${index + 1}`,
        amount: 35000,
        date: `2026-07-${String(20 - index).padStart(2, "0")}`,
        status: "ACTIVE",
      })),
    });
    contributionSummary.mockResolvedValue({
      totalFamilies: 0, cepaPaid: 0, cepaPending: 0,
      solidarityPaid: 0, solidarityPending: 0, fullyPaid: 0, withPending: 0,
    });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText("Movimiento 1")).toBeInTheDocument());
    expect(screen.queryByText("Movimiento 6")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente ▶" }));
    expect(screen.getByText("Movimiento 6")).toBeInTheDocument();
    expect(screen.getByText("Cuota")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir" }))
      .toHaveAttribute("href", "/tesoreria/cuotas");
  });

  it("pagina cinco trazas por página", async () => {
    dashboardOverview.mockResolvedValue({
      ...overview,
      auditTrail: Array.from({ length: 6 }, (_, index) => ({
        id: index + 1,
        action: "REGISTRAR_PAGO",
        entityType: "OBLIGACION",
        entityId: String(index + 1),
        performedBy: "admin@mail.com",
        details: `Traza ${index + 1}`,
        createdAt: `2026-07-${String(20 - index).padStart(2, "0")}T10:00:00`,
      })),
    });
    contributionSummary.mockResolvedValue({
      totalFamilies: 0, cepaPaid: 0, cepaPending: 0,
      solidarityPaid: 0, solidarityPending: 0, fullyPaid: 0, withPending: 0,
    });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText("Traza 1")).toBeInTheDocument());
    expect(screen.queryByText("Traza 6")).not.toBeInTheDocument();
    const pagination = screen.getByRole("navigation",
      { name: "Paginación de trazas de Tesorería" });
    fireEvent.click(within(pagination).getByRole("button", { name: "Siguiente ▶" }));
    expect(screen.getByText("Traza 6")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });
});
