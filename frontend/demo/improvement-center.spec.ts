import { expect, test, type Page, type Route } from "@playwright/test";

const user = {
  id: 10,
  code: "USR-00000010",
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
    totalFamilies: 3,
    annualFamilies: 2,
    twoInstallmentFamilies: 1,
    pendingObligations: 2,
    paidObligations: 4,
    collectedAmount: 140_000,
    pendingAmount: 70_000,
  },
  finances: {
    schoolYear: 2026,
    feeIncome: 140_000,
    otherIncome: 100_000,
    totalIncome: 240_000,
    totalExpenses: 30_000,
    availableBalance: 210_000,
  },
  courseComposition: { masculino: 12, femenino: 15, otros: 0 },
  monthlyCashFlow: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    income: index === 6 ? 100_000 : 0,
    expense: index === 6 ? 30_000 : 0,
  })),
  obligationStatus: [{ status: "PAGADA", count: 4 }, { status: "PENDIENTE", count: 2 }],
  expensesByCategory: [{ category: "MATERIALS", amount: 30_000 }],
  expensesByDescription: [
    { id: 1, description: "Colaciones reunion", category: "FOOD", amount: 20_000 },
  ],
  recentMovements: [],
  auditTrail: [],
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
  let createdSuggestion = {
    id: 321,
    category: "PAYMENTS",
    selectedItems: ["Mas filtros"],
    title: "Filtrar pagos",
    description: "Necesito filtrar pagos por fecha y metodo de pago.",
    userImpact: "DIFFICULT",
    screenshotUrl: null,
    sourceRoute: "/dashboard",
    status: "RECEIVED",
    createdAt: "2026-09-01T10:00:00",
    updatedAt: "2026-09-01T10:00:00",
  };

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
    if (path.endsWith("/community/about")) return json(route, []);
    if (path.endsWith("/community/gallery")) return json(route, []);
    if (path.endsWith("/community/board")) return json(route, []);
    if (path.endsWith("/tesoreria/dashboard/overview")) return json(route, overview);
    if (path.endsWith("/tesoreria/aportes/resumen")) {
      return json(route, {
        totalFamilies: 4,
        cepaPaid: 3,
        cepaPending: 1,
        solidarityPaid: 2,
        solidarityPending: 2,
        fullyPaid: 2,
        withPending: 2,
      });
    }
    if (path.endsWith("/improvements") && method === "POST") {
      expect(request.postData() ?? "").toContain("/dashboard");
      return json(route, createdSuggestion, 201);
    }
    if (path.endsWith("/improvements/mine")) return json(route, [createdSuggestion]);
    if (path.endsWith("/notifications")) return json(route, []);

    return json(route, {});
  });
};

const dismissTour = async (page: Page) => {
  const skipButton = page.getByRole("button", { name: "Omitir" });
  await skipButton.click({ timeout: 2_000 }).catch(() => undefined);
};

test("centro de mejoras permite enviar y consultar una sugerencia", async ({ page }) => {
  await mockApi(page);

  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Centro de Mejoras" })).toHaveCount(0);

  await page.getByLabel("Correo").fill(user.correo);
  await page.getByRole("textbox", { name: /Contrase/ }).fill("DemoApoderado1!");
  await page.getByRole("button", { name: /Ingresar/i }).click();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await dismissTour(page);

  await page.getByRole("button", { name: "Enviar sugerencia" }).click();
  const dialog = page.getByRole("dialog", { name: "Centro de Mejoras" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Pagos" }).click();
  await dialog.getByLabel(/filtros/i).check();
  await dialog.getByLabel("Resume tu sugerencia").fill("Filtrar pagos");
  await dialog.getByLabel(/necesitas/i)
    .fill("Necesito filtrar pagos por fecha y metodo de pago.");
  await dialog.getByRole("button", { name: /Me dificulta trabajar/i }).click();
  await dialog.getByRole("button", { name: "Enviar sugerencia" }).click();

  await expect(page.getByText("Gracias. Tu sugerencia #321 fue enviada correctamente."))
    .toBeVisible();
  await expect(page.getByText(/#321 Filtrar pagos/)).toBeVisible();

  await page.getByText(/#321 Filtrar pagos/).click();
  await expect(page.getByText("Necesito filtrar pagos por fecha y metodo de pago.")).toBeVisible();
  await expect(page.getByText("/dashboard")).toBeVisible();
});
