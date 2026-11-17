import { clearDashboardCache } from "./dashboardCache";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

vi.mock("@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl", () => ({
  AlumnoRepositoryImpl: vi.fn().mockImplementation(function () {
    return { getBirthdays: vi.fn().mockResolvedValue([]) };
  }),
}));

const { dashboardOverview, contributionSummary, eventProfits, currentUser } = vi.hoisted(() => ({
  dashboardOverview: vi.fn(), contributionSummary: vi.fn(), eventProfits: vi.fn(),
  currentUser: { rol: "ADMIN" },
}));

vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({
  TreasuryRepositoryImpl: vi.fn().mockImplementation(function () {
    return { dashboardOverview, contributionSummary, eventProfits,
      getBoardMessage: vi.fn().mockResolvedValue({ heading: "De parte de la directiva",
        title: "Gracias por hacer equipo.", message: "Mensaje de la directiva",
        signature: "Con cariño,\nLa directiva del curso" }) };
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
  courseComposition: { masculino: 12, femenino: 15, otros: 1 },
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
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    // jsdom no implementa matchMedia; evitar animaciones al comprobar los datos.
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    clearDashboardCache();
    vi.clearAllMocks();
    eventProfits.mockResolvedValue([]);
    currentUser.rol = "ADMIN";
  });

  it("muestra todos los egresos por fecha sin numeración ni paginación", async () => {
    dashboardOverview.mockResolvedValue({ ...overview, recentMovements:
      Array.from({ length: 8 }, (_, index) => ({ id: index + 1, type: "EGRESO",
        description: `Gasto de prueba ${index + 1}`, amount: 8000 - index * 100,
        date: `2026-10-${String(index + 1).padStart(2, "0")}`, status: "ACTIVE" })), expensesByDescription:
      Array.from({ length: 8 }, (_, index) => ({ id: index + 1,
        description: `Gasto de prueba ${index + 1}`, category: "FOOD", amount: 8000 - index * 100 })) });
    contributionSummary.mockResolvedValue({ totalFamilies: 0 });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Egresos", exact: true }));
    expect(screen.getByText("Gasto de prueba 7")).toBeVisible();
    expect(screen.getByText("Gasto de prueba 8")).toBeVisible();
    const list = screen.getByRole("list", { name: "Egresos por fecha" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(8);
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("Gasto de prueba 8");
    expect(within(list).getAllByRole("listitem")[7]).toHaveTextContent("Gasto de prueba 1");
    expect(screen.queryByRole("navigation", { name: "Paginación de egresos" })).not.toBeInTheDocument();
    const selectedYear = screen.getByRole("button", { name: "Año escolar" }).textContent;
    expect(screen.getByRole("link", { name: "Más detalles" })).toHaveAttribute("href",
      `/tesoreria/gastos?year=${selectedYear}`);
  });

  it("reutiliza el dashboard al salir y volver sin otro loader ni consultas repetidas", async () => {
    dashboardOverview.mockResolvedValue(overview);
    contributionSummary.mockResolvedValue({ totalFamilies: 0 });
    const first = render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByLabelText("Cargando indicadores del curso")).not.toBeInTheDocument());
    first.unmount();
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.queryByLabelText("Cargando indicadores del curso")).not.toBeInTheDocument();
    expect(screen.getByText("$240.000")).toBeInTheDocument();
    expect(dashboardOverview).toHaveBeenCalledTimes(1);
    expect(contributionSummary).toHaveBeenCalledTimes(1);
    expect(eventProfits).toHaveBeenCalledTimes(1);
  });

  it("[DashboardPage #01] muestra skeletons de datos y luego métricas y actividad reales", async () => {
    dashboardOverview.mockResolvedValue(overview);
    contributionSummary.mockResolvedValue({
      totalFamilies: 4, cepaPaid: 3, cepaPending: 1,
      solidarityPaid: 2, solidarityPending: 2, fullyPaid: 2, withPending: 2,
    });
    const { container } = render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.queryByLabelText("Cargando indicadores del curso")).not.toBeInTheDocument();
    expect(container.querySelector(".react-loading-skeleton")).not.toBeInTheDocument();
    expect(container.querySelector("main")).not.toHaveAttribute("inert");

    await waitFor(() => expect(screen.getByText("$240.000")).toBeInTheDocument());
    const activityToggle = screen.getByRole("button", { name: "Movimientos", exact: true });
    expect(activityToggle).not.toHaveAttribute("aria-expanded");
    fireEvent.click(activityToggle);
    expect(within(screen.getByRole("list", { name: "Actividad reciente" })).getByText("Rifa escolar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "General", exact: true }));
    const selectedYear = screen.getByRole("button", { name: "Año escolar" }).textContent;
    expect(screen.getByRole("link", { name: "Ingresos totales" })).toHaveAttribute("href",
      `/tesoreria/ingresos?year=${selectedYear}`);
    expect(screen.getByRole("link", { name: "Egresos activos" })).toHaveAttribute("href",
      `/tesoreria/gastos?year=${selectedYear}`);
    expect(screen.getByRole("link", { name: /^Ingresos\s*\$/ })).toHaveAttribute("href", `/tesoreria/ingresos?year=${selectedYear}`);
    expect(screen.getByRole("link", { name: /^Egresos\s*\$/ })).toHaveAttribute("href", `/tesoreria/gastos?year=${selectedYear}`);
    fireEvent.click(screen.getByRole("button", { name: "Recaudación", exact: true }));
    const cepaCard = screen.getByRole("heading", { name: "Cuota CEPA" }).closest("article");
    const solidarityCard = screen.getByRole("heading",
      { name: "Fondo de Apoyo por Fallecimiento" }).closest("article");
    expect(cepaCard?.querySelector(".contribution-donut__chart > strong")).toHaveTextContent("75%");
    expect(solidarityCard?.querySelector(".contribution-donut__chart > strong"))
      .toHaveTextContent("50%");
    expect(cepaCard).toHaveTextContent("Pagadas3");
    expect(cepaCard).toHaveTextContent("Pendientes1");
    expect(cepaCard?.querySelector(".recharts-tooltip-wrapper")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Movimientos", exact: true })).not.toHaveAttribute("aria-expanded");
    fireEvent.click(screen.getByRole("button", { name: "Movimientos", exact: true }));
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
    const activityToggle = screen.getByRole("button", { name: "Movimientos", exact: true });
    expect(activityToggle).not.toHaveAttribute("aria-expanded");
    fireEvent.click(activityToggle);
    expect(screen.getByText("Actividad reciente")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Actividad reciente" })).getByText("Rifa escolar")).toBeInTheDocument();
    expect(screen.queryByText("Trazas de Tesorería")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Auditoría", exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recaudación", exact: true }));
    expect(screen.getByRole("heading", { name: "Cuota anual" })).toBeInTheDocument();
    expect(screen.getByText("Cuota única")).toBeInTheDocument();
    expect(screen.getByText("Dos cuotas")).toBeInTheDocument();
    expect(screen.getByText("$140.000 de $210.000")).toBeInTheDocument();
    expect(screen.getByText("67% recaudado")).toBeInTheDocument();
    expect(screen.getByText("Pendiente: $70.000")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Avance de recaudación" }))
      .toHaveAttribute("aria-valuenow", "67");
    fireEvent.click(screen.getByRole("button", { name: "Egresos", exact: true }));
    expect(screen.getByRole("heading", { name: "Egresos por fecha" })).toBeInTheDocument();
    expect(screen.getByText("Colaciones reunión")).toBeInTheDocument();
    expect(screen.queryByText("Alimentación")).not.toBeInTheDocument();
  });

  it("muestra al apoderado la composicion agregada del curso", async () => {
    currentUser.rol = "USER";
    dashboardOverview.mockResolvedValue(overview);
    contributionSummary.mockResolvedValue({
      totalFamilies: 0, cepaPaid: 0, cepaPending: 0,
      solidarityPaid: 0, solidarityPending: 0, fullyPaid: 0, withPending: 0,
    });

    const { container } = render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    const composition = await waitFor(() => {
      const card = container.querySelector(".dashboard-gender-card");
      expect(card).toBeInTheDocument();
      return card;
    });
    const values = [...composition!.querySelectorAll(".dashboard-gender-card__items b")]
      .map(item => item.textContent);
    expect(values).toEqual(["12", "15", "1"]);
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

    await waitFor(() => expect(screen.getByRole("button", { name: "Movimientos", exact: true })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Movimientos", exact: true }));
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Actividad reciente" })).getByText("Movimiento 1")).toBeInTheDocument());
    expect(within(screen.getByRole("list", { name: "Actividad reciente" })).queryByText("Movimiento 6")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente ▶" }));
    expect(within(screen.getByRole("list", { name: "Actividad reciente" })).getByText("Movimiento 6")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Auditoría", exact: true }));
    const pagination = screen.getByRole("navigation",
      { name: "Paginación de trazas de Tesorería" });
    fireEvent.click(within(pagination).getByRole("button", { name: "Siguiente ▶" }));
    expect(screen.getByText("Traza 6")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });
  it("cambia entre vistas sin desplegables de contenido", async () => {
    dashboardOverview.mockResolvedValue(overview);
    contributionSummary.mockResolvedValue({ totalFamilies: 0 });
    const { container } = render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "General", exact: true });
    for (const [name, id] of [["General", "general"], ["Recaudación", "collection"],
      ["Movimientos", "movements"], ["Egresos", "expenses"],
      ["Eventos y curso", "course"], ["Auditoría", "audit"]]) {
      const button = screen.getByRole("button", { name, exact: true });
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-current", "page");
      expect(container.querySelector(".business-dashboard")).toHaveAttribute("data-view", id);
    }
    expect(container.querySelector(".dashboard-collapse-trigger")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eventos y curso", exact: true }));
    expect(screen.getByRole("heading", { name: "Ganancias de eventos" })).toBeVisible();
    expect(screen.getByRole("article", { name: "Composición del curso" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Eventos", exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Curso", exact: true })).not.toBeInTheDocument();
  });
});
