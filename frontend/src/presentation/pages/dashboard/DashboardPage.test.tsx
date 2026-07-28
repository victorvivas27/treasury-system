import { render, screen, waitFor } from "@testing-library/react";
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

  it("oculta la actividad y las trazas al usuario común", async () => {
    currentUser.rol = "USER";
    dashboardOverview.mockResolvedValue(overview);
    contributionSummary.mockResolvedValue({
      totalFamilies: 4, cepaPaid: 3, cepaPending: 1,
      solidarityPaid: 2, solidarityPending: 2, fullyPaid: 2, withPending: 2,
    });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText("$240.000")).toBeInTheDocument());
    expect(screen.queryByText("Actividad reciente")).not.toBeInTheDocument();
    expect(screen.queryByText("Trazas de Tesorería")).not.toBeInTheDocument();
    expect(screen.getByText("Estado de obligaciones")).toBeInTheDocument();
  });
});
