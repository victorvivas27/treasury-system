import { expect, test, type Page, type Route } from "@playwright/test";

const user = {
  id: 10,
  code: "AP-00000001",
  nombre: "Camila Rojas",
  correo: "apoderado.demo@curso.cl",
  rol: "USER",
  enabled: true,
  accountNonLocked: true,
  emailVerifiedAt: "2026-03-15T10:00:00",
  createdAt: "2026-03-15T10:00:00",
  updatedAt: "2026-08-31T10:00:00",
  profileImageType: "INITIALS",
  profileImageUrl: null,
};

const token = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  btoa(JSON.stringify({ sub: user.correo, exp: 2_000_000_000 })).replaceAll("=", ""),
  "demo",
].join(".");

const overview = {
  quotas: {
    totalFamilies: 28,
    annualFamilies: 17,
    twoInstallmentFamilies: 11,
    pendingObligations: 8,
    paidObligations: 42,
    collectedAmount: 1_260_000,
    pendingAmount: 240_000,
  },
  finances: {
    schoolYear: 2026,
    feeIncome: 1_260_000,
    otherIncome: 385_000,
    totalIncome: 1_645_000,
    totalExpenses: 742_000,
    availableBalance: 903_000,
  },
  courseComposition: { masculino: 15, femenino: 13, otros: 0 },
  monthlyCashFlow: [
    { month: 3, income: 280_000, expense: 90_000 },
    { month: 4, income: 460_000, expense: 120_000 },
    { month: 5, income: 220_000, expense: 180_000 },
    { month: 6, income: 310_000, expense: 95_000 },
    { month: 7, income: 195_000, expense: 142_000 },
    { month: 8, income: 180_000, expense: 115_000 },
  ],
  obligationStatus: [
    { status: "PAGADA", count: 42 },
    { status: "PENDIENTE", count: 8 },
  ],
  expensesByCategory: [
    { category: "MATERIALS", amount: 210_000 },
    { category: "EVENTS", amount: 335_000 },
    { category: "FOOD", amount: 197_000 },
  ],
  expensesByDescription: [
    { id: 1, description: "Materiales convivencia de curso", category: "MATERIALS", amount: 210_000 },
    { id: 2, description: "Arriendo implementos fiesta costumbrista", category: "EVENTS", amount: 185_000 },
    { id: 3, description: "Insumos stand de pizzas", category: "FOOD", amount: 150_000 },
  ],
  recentMovements: [
    { id: 101, type: "CUOTA", description: "Cuota anual - Familia Rojas", amount: 60_000, date: "2026-08-20", status: "ACTIVE" },
    { id: 102, type: "INGRESO", description: "Rifa solidaria", amount: 185_000, date: "2026-08-18", status: "ACTIVE" },
    { id: 103, type: "EGRESO", description: "Decoracion aniversario", amount: 72_000, date: "2026-08-11", status: "ACTIVE" },
  ],
  auditTrail: [],
};

const bank = {
  id: 1,
  schoolYear: 2026,
  accountHolderName: "Centro de Padres 6B",
  accountHolderRut: "76543210-9",
  bankName: "Banco Estado",
  accountType: "Cuenta Vista",
  accountNumber: "123456789",
  email: "tesoreria.curso@example.cl",
};

const myPayments = {
  schoolYear: 2026,
  totalAmount: 60_000,
  allowedMode: "AMBAS",
  studentName: "Martina Rojas",
  selectedMode: "DOS_CUOTAS",
  paidAmount: 30_000,
  bankAccount: bank,
  installments: [
    {
      id: 1,
      concept: "Primera cuota",
      amount: 30_000,
      dueDate: "2026-04-30",
      status: "PAGADA",
      history: [{ id: 11, amount: 30_000, status: "PAID", paidAt: "2026-04-20", originalFileName: "comprobante-abril.pdf", submittedAt: "2026-04-20", rejectionReason: null }],
    },
    {
      id: 2,
      concept: "Segunda cuota",
      amount: 30_000,
      dueDate: "2026-09-30",
      status: "PENDIENTE",
      history: [],
    },
  ],
};

const incomes = [
  { id: 1, schoolYear: 2026, description: "Rifa solidaria", amount: 185_000, incomeDate: "2026-08-18", category: "RAFFLE", source: "Familias del curso", paymentMethod: "TRANSFER", receiptNumber: "ING-001", course: "6B", familyId: 12, notes: "Recaudacion voluntaria", status: "ACTIVE", registeredBy: "Tesoreria", createdAt: "2026-08-18T12:00:00", updatedAt: "2026-08-18T12:00:00" },
  { id: 2, schoolYear: 2026, description: "Venta de completos", amount: 200_000, incomeDate: "2026-07-12", category: "SALE", source: "Actividad colegio", paymentMethod: "CASH", receiptNumber: "ING-002", course: "6B", familyId: undefined, notes: "", status: "ACTIVE", registeredBy: "Tesoreria", createdAt: "2026-07-12T18:00:00", updatedAt: "2026-07-12T18:00:00" },
];

const expenses = [
  { id: 1, schoolYear: 2026, description: "Materiales convivencia de curso", amount: 210_000, expenseDate: "2026-08-09", category: "MATERIALS", paymentMethod: "TRANSFER", recipient: "Libreria Central", receiptNumber: "BOL-983", notes: "Cartulinas, temperas y materiales", status: "ACTIVE", registeredBy: "Tesoreria", createdAt: "2026-08-09T11:00:00", updatedAt: "2026-08-09T11:00:00" },
  { id: 2, schoolYear: 2026, description: "Decoracion aniversario", amount: 72_000, expenseDate: "2026-08-11", category: "DECORATION", paymentMethod: "CARD", recipient: "Proveedor local", receiptNumber: "BOL-984", notes: "", status: "ACTIVE", registeredBy: "Tesoreria", createdAt: "2026-08-11T14:00:00", updatedAt: "2026-08-11T14:00:00" },
];

const eventOptions = [
  { id: 7, name: "Fiesta Costumbrista", eventDate: "2026-09-14" },
];

const standList = [
  { id: 501, eventId: 7, eventName: "Fiesta Costumbrista", name: "Stand de pizzas 6B", date: "2026-09-14", startTime: "10:00:00", endTime: "17:00:00", responsible: "Directiva 6B", initialFund: 50_000, status: "CLOSED", paymentMethods: ["CASH", "DEBIT", "TRANSFER"], debitCommission: 2.9, creditCommission: 3.4, transferCommission: 0 },
];

const standSummary = {
  totalSold: 485_000,
  salesByPaymentMethod: { CASH: 135_000, DEBIT: 210_000, CREDIT: 0, TRANSFER: 140_000, OTHER: 0 },
  expectedCash: 185_000,
  initialFund: 50_000,
  totalCost: 210_000,
  commissions: 6_090,
  debitCommission: 6_090,
  creditCommission: 0,
  transferCommission: 0,
  netProfit: 268_910,
  saleCount: 64,
  unitsSold: 96,
  salesByProduct: [
    { product: "Pizza margarita", category: "Comida", variant: "Margarita", units: 52, total: 260_000, cost: 110_000, profit: 150_000 },
    { product: "Pizza pepperoni", category: "Comida", variant: "Pepperoni", units: 44, total: 225_000, cost: 100_000, profit: 125_000 },
  ],
  salesByCategory: { Comida: 485_000 },
  salesByVariant: { Margarita: 260_000, Pepperoni: 225_000 },
  stockAlerts: [
    { productId: 1, product: "Pizza margarita", variant: "Margarita", initialStock: 80, stock: 28, soldOut: false },
    { productId: 2, product: "Pizza pepperoni", variant: "Pepperoni", initialStock: 60, stock: 16, soldOut: false },
  ],
  unitsByPresentation: { Porcion: 96 },
  equivalentUnits: 12,
  equivalentUnitsByVariant: { Margarita: 6.5, Pepperoni: 5.5 },
};

const profile = {
  familyId: 12,
  familyCode: "FA-00000012",
  studentName: "Martina Rojas",
  studentMessage: "Sin observaciones academicas pendientes.",
  guardianPhone: "+56 9 8765 4321",
  relationship: "Madre",
  primaryGuardian: true,
  mode: "DOS_CUOTAS",
  obligations: [
    { id: 1, familyId: 12, familyCode: "FA-00000012", primaryGuardian: "Camila Rojas", studentName: "Martina Rojas", course: "6B", mode: "DOS_CUOTAS", installment: "PRIMERA", concept: "Primera cuota", amount: 30_000, dueDate: "2026-04-30", paymentDate: "2026-04-20", status: "PAGADA" },
    { id: 2, familyId: 12, familyCode: "FA-00000012", primaryGuardian: "Camila Rojas", studentName: "Martina Rojas", course: "6B", mode: "DOS_CUOTAS", installment: "SEGUNDA", concept: "Segunda cuota", amount: 30_000, dueDate: "2026-09-30", status: "PENDIENTE" },
  ],
  cepa: { id: 1, status: "PAID", paymentDate: "2026-05-05", amount: 10_000, registeredBy: "Tesoreria" },
  solidarity: { id: 2, status: "PENDING" },
};

const json = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

const mockApi = async (page: Page) => {
  let authenticated = false;

  await page.route("**/tesoreria/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith("/auth/login") && method === "POST") {
      authenticated = true;
      return json(route, { token, user });
    }
    if (path.endsWith("/auth/me")) return json(route, user);
    if (path.endsWith("/auth/refresh")) {
      return authenticated
        ? json(route, { token, user })
        : json(route, { errors: { auth: "Sin sesion" } }, 401);
    }
    if (path.endsWith("/tesoreria/dashboard/overview")) return json(route, overview);
    if (path.endsWith("/tesoreria/aportes/resumen")) {
      return json(route, { totalFamilies: 28, cepaPaid: 24, cepaPending: 4, solidarityPaid: 20, solidarityPending: 8, fullyPaid: 19, withPending: 9 });
    }
    if (path.endsWith("/tesoreria/resumen-financiero")) return json(route, overview.finances);
    if (path.endsWith("/tesoreria/pagos-transferencia/cuenta-bancaria")) return json(route, bank);
    if (path.endsWith("/tesoreria/pagos-transferencia/mis-pagos")) return json(route, myPayments);
    if (path.includes("/tesoreria/pagos-transferencia/mis-cuotas/")) return json(route, myPayments);
    if (path.endsWith("/tesoreria/ingresos")) return json(route, incomes);
    if (path.match(/\/tesoreria\/ingresos\/\d+\/adjuntos$/)) return json(route, []);
    if (path.endsWith("/tesoreria/egresos")) return json(route, expenses);
    if (path.match(/\/tesoreria\/egresos\/\d+\/adjuntos$/)) return json(route, []);
    if (path.endsWith("/tesoreria/eventos/consulta")) return json(route, eventOptions);
    if (path.endsWith("/tesoreria/stands")) return json(route, standList);
    if (path.endsWith("/tesoreria/stands/501/resumen")) return json(route, standSummary);
    if (path.endsWith("/tesoreria/perfil")) return json(route, profile);
    if (path.endsWith("/notifications")) return json(route, []);

    return json(route, {});
  });
};

const capture = async (page: Page, name: string) => {
  await page.screenshot({
    path: `demo-output/apoderado/${name}.png`,
    fullPage: true,
  });
};

const dismissTour = async (page: Page) => {
  const skipButton = page.getByRole("button", { name: "Omitir" });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
  }
};

test("demo completa del rol apoderado", async ({ page }) => {
  await mockApi(page);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await capture(page, "01-login");

  await page.getByLabel("Correo").fill(user.correo);
  await page.getByRole("textbox", { name: "Contraseña" }).fill("DemoApoderado1!");
  await page.getByRole("button", { name: /Ingresar/i }).click();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await dismissTour(page);
  await capture(page, "02-dashboard");

  await page.goto("/tesoreria/pagos");
  await expect(page.getByRole("heading", { name: "Pagos" })).toBeVisible();
  await capture(page, "03-pagos");

  await page.goto("/tesoreria/ingresos");
  await expect(page.getByRole("heading", { name: "Ingresos" })).toBeVisible();
  await capture(page, "04-ingresos");

  await page.goto("/tesoreria/gastos");
  await expect(page.getByRole("heading", { name: "Egresos" })).toBeVisible();
  await page.getByRole("button", { name: /Ver detalle de Materiales convivencia/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await capture(page, "05-egresos-detalle");

  await page.goto("/tesoreria/stands");
  await expect(page.getByText("Ventas del stand").first()).toBeVisible();
  await capture(page, "06-stands-resumen");

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: user.nombre })).toBeVisible();
  await capture(page, "07-perfil");
});
