import { expect, test, type Page, type Route } from "@playwright/test";

const admin = {
  id: 20,
  code: "ADM-00000020",
  nombre: "Admin Curso",
  correo: "admin.demo@curso.cl",
  rol: "ADMIN",
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
  btoa(JSON.stringify({ sub: admin.correo, exp: 2_000_000_000 })).replaceAll("=", ""),
  "demo",
].join(".");

const suggestion = {
  id: 321,
  category: "PAYMENTS",
  selectedItems: ["Mas filtros"],
  title: "Filtrar pagos",
  description: "Necesito filtrar pagos por fecha y metodo de pago.",
  userImpact: "DIFFICULT",
  internalPriority: "MEDIUM",
  screenshotUrl: "/admin/improvements/321/screenshot",
  sourceRoute: "/dashboard",
  status: "RECEIVED",
  userId: 10,
  userName: "Camila Rojas",
  userEmail: "apoderado.demo@curso.cl",
  userRole: "USER",
  organizationId: 3,
  organizationName: "Tesoreria 6B",
  courseName: "6B",
  schoolYear: 2026,
  relatedSuggestionIds: [],
  createdAt: "2026-09-01T10:00:00",
  updatedAt: "2026-09-01T10:00:00",
};

const json = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
};

const mockApi = async (page: Page) => {
  let authenticated = false;
  let current = { ...suggestion };
  let note = null as null | {
    id: number;
    authorUserId: number;
    authorName: string;
    authorEmail: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  };

  await page.route("**/tesoreria/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.endsWith("/auth/login") && method === "POST") {
      authenticated = true;
      return json(route, { token, user: admin });
    }
    if (path.endsWith("/auth/me")) return json(route, admin);
    if (path.endsWith("/auth/refresh")) {
      return authenticated
        ? json(route, { token, user: admin })
        : json(route, { errors: { auth: "Sin sesion" } }, 401);
    }
    if (path.endsWith("/community/about") || path.endsWith("/community/gallery")
      || path.endsWith("/community/board") || path.endsWith("/notifications")) {
      return json(route, []);
    }
    if (path.endsWith("/admin/improvements/summary")) {
      return json(route, { total: 1, received: 1, underReview: 0, planned: 0,
        implemented: 0, critical: current.internalPriority === "CRITICAL" ? 1 : 0 });
    }
    if (path.endsWith("/admin/improvements") && method === "GET") {
      return json(route, { content: [current], page: 0, size: 10, totalElements: 1, totalPages: 1 });
    }
    if (path.endsWith("/admin/improvements/321") && method === "GET") return json(route, current);
    if (path.endsWith("/admin/improvements/321/screenshot") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "image/png", body: "png" });
    }
    if (path.endsWith("/admin/improvements/321/status") && method === "PATCH") {
      current = { ...current, status: "UNDER_REVIEW" };
      return json(route, current);
    }
    if (path.endsWith("/admin/improvements/321/priority") && method === "PATCH") {
      current = { ...current, internalPriority: "HIGH" };
      return json(route, current);
    }
    if (path.endsWith("/admin/improvements/321/notes") && method === "GET") {
      return json(route, note ? [note] : []);
    }
    if (path.endsWith("/admin/improvements/321/notes") && method === "POST") {
      note = { id: 7, authorUserId: 20, authorName: admin.nombre, authorEmail: admin.correo,
        content: "Revisar con tesoreria.", createdAt: "2026-09-01T12:00:00",
        updatedAt: "2026-09-01T12:00:00" };
      return json(route, note, 201);
    }
    if (path.endsWith("/admin/improvements/321/history")) {
      return json(route, [{ id: 1, changedByName: admin.nombre, changedByEmail: admin.correo,
        fieldName: "status", oldValue: "RECEIVED", newValue: "UNDER_REVIEW",
        createdAt: "2026-09-01T12:00:00" }]);
    }

    return json(route, {});
  });
};

const dismissTour = async (page: Page) => {
  await page.getByRole("button", { name: "Omitir" }).click({ timeout: 2_000 }).catch(() => undefined);
};

test("admin gestiona sugerencias recibidas", async ({ page }) => {
  await mockApi(page);

  await page.goto("/login");
  await page.getByLabel("Correo").fill(admin.correo);
  await page.getByRole("textbox", { name: /Contrase/ }).fill("DemoAdmin1!");
  await page.getByRole("button", { name: /Ingresar/i }).click();
  await page.goto("/admin/mejoras");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "Gestión de Mejoras" })).toBeVisible();
  await expect(page.getByText(/#321 Filtrar pagos/)).toBeVisible();
  await expect(page.getByText("Tesoreria 6B")).toBeVisible();
  const screenshotRequest = page.waitForRequest(/\/tesoreria\/api\/v1\/admin\/improvements\/321\/screenshot$/);
  await page.getByRole("button", { name: "Ver captura adjunta" }).click();
  await screenshotRequest;

  const detail = page.getByLabel("Detalle administrativo");
  await detail.getByLabel("Estado").selectOption("UNDER_REVIEW");
  await expect(page.getByText("Estado actualizado.")).toBeVisible();

  await detail.getByLabel("Prioridad interna").selectOption("HIGH");
  await expect(page.getByText("Prioridad actualizada.")).toBeVisible();

  await detail.getByLabel("Nota interna").fill("Revisar con tesoreria.");
  await detail.getByRole("button", { name: "Agregar nota" }).click();
  await expect(page.getByText("Nota interna agregada.")).toBeVisible();
  await expect(page.getByText("Revisar con tesoreria.")).toBeVisible();
});
