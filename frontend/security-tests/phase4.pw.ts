import { test, expect, type Page } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";

const user = { id: 9001, code: "USR-FIXTURE", nombre: "Security Fixture", correo: "fixture@example.test",
  rol: "SUPER_ADMIN", enabled: true, accountNonLocked: true, profileImageType: "INITIALS",
  profileImageUrl: null, emailVerifiedAt: "2026-10-27T00:00:00", createdAt: "2026-10-27", updatedAt: "2026-10-27" };
const session = { token: "local-browser-fixture-not-a-real-jwt", tokenType: "Bearer", expiresIn: 900, user };
const cors = {
  "access-control-allow-origin": "http://127.0.0.1:5186", "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET, POST, PATCH, OPTIONS", "access-control-allow-headers": "authorization,content-type,x-csrf-token",
};

const mockApi = async (page: Page, authenticated = false) => {
  const sockets: string[] = [];
  page.on("pageerror", error => console.error("Browser runtime error:", error.message));
  // Headless Chromium exposes BadgeService but terminates workers when it is used.
  // Keep real service-worker/cache behavior; only replace the unrelated OS badge bridge.
  await page.addInitScript(() => {
    for (const name of ["setAppBadge", "clearAppBadge"] as const) {
      Object.defineProperty(navigator, name, { configurable: true, value: async () => undefined });
    }
    if (typeof ServiceWorker === "undefined") return;
    const original = ServiceWorker.prototype.postMessage;
    ServiceWorker.prototype.postMessage = function (message, ...args) {
      if (message?.type === "SYNC_BADGE") return;
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
  await page.route("**/tesoreria/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname.replace("/tesoreria/api/v1", "");
    let body: unknown = [];
    let status = 200;
    if (path === "/auth/refresh") { body = authenticated ? session : {}; status = authenticated ? 200 : 401; }
    else if (path === "/auth/me") body = user;
    else if (path === "/auth/verify-email") body = { message: "Correo verificado" };
    else if (path === "/auth/reset-password") body = { message: "Clave actualizada" };
    else if (path === "/admin/architecture/access") body = { allowed: true };
    else if (path === "/admin/quality-reports") body = { configured: false, reports: [] };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers: cors });
  });
  await page.routeWebSocket("**/tesoreria/ws", socket => {
    sockets.push(socket.url());
    socket.onMessage(message => {
      if (String(message).startsWith("CONNECT")) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
    });
  });
  return sockets;
};

test("headers are present once on SPA, assets, service worker and errors", async ({ request }) => {
  const asset = readdirSync("dist/assets").find(name => name.endsWith(".js"))!;
  for (const [url, status] of [["/login", 200], ["/restablecer-password", 200], [`/assets/${asset}`, 200],
    ["/RESTABLECER-PASSWORD/", 200], ["/%76erificar-correo", 200],
    ["/service-worker.js", 200], ["/assets/missing-phase4.js", 404], ["/avatars/missing-phase4.png", 404], ["/email/missing-phase4.png", 404]] as const) {
    const response = await request.get(url);
    expect(response.status()).toBe(status);
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(headers["content-security-policy"]).toBe("frame-ancestors 'none'; object-src 'none'");
    expect(headers["content-security-policy-report-only"]).not.toContain("unsafe-eval");
    expect(headers["strict-transport-security"]).toBeUndefined();
    if (["/restablecer-password", "/RESTABLECER-PASSWORD/", "/%76erificar-correo"].includes(url)) expect(headers["cache-control"]).toBe("no-store");
    for (const name of ["content-security-policy", "content-security-policy-report-only", "x-frame-options"]) {
      expect(response.headersArray().filter(item => item.name.toLowerCase() === name)).toHaveLength(1);
    }
  }
});

test("print popups retain styles and event handlers without an opener", async ({ page }) => {
  await mockApi(page);
  await page.goto("/login");
  const opened = page.waitForEvent("popup");
  await page.evaluate(() => {
    const popup = window.open("", "_blank")!;
    popup.opener = null;
    popup.document.open();
    popup.document.write('<!doctype html><html><head><style>body{color:rgb(12,34,56)}</style></head><body><button id="print">Imprimir</button></body></html>');
    popup.document.close();
    popup.document.getElementById("print")!.addEventListener("click", () => { popup.document.body.dataset.printed = "yes"; });
  });
  const popup = await opened;
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await expect(popup.locator("body")).toHaveCSS("color", "rgb(12, 34, 56)");
  await popup.getByRole("button", { name: "Imprimir" }).click();
  await expect(popup.locator("body")).toHaveAttribute("data-printed", "yes");
});

for (const path of ["restablecer-password", "aceptar-invitacion", "verificar-correo"]) {
  for (const transport of ["?", "#"]) {
    test(`${path}: ${transport}token stays in memory and is removed from URL`, async ({ page }) => {
      await mockApi(page);
      const token = `phase4-${path}-${transport === "#" ? "fragment" : "legacy"}`;
      const requests: string[] = [];
      page.on("request", request => { requests.push(request.url()); });
      const operation = page.waitForRequest(request => request.method() === "POST"
        && request.url().endsWith(path === "verificar-correo" ? "/auth/verify-email" : "/auth/reset-password"));
      await page.goto(`/${path}${transport}token=${token}`);
      await expect(page).toHaveURL(`http://127.0.0.1:5186/${path}`);
      if (path !== "verificar-correo") {
        await page.getByLabel("Nueva contraseña", { exact: true }).fill("BrowserFixture1!");
        await page.getByLabel("Repite tu contraseña", { exact: true }).fill("BrowserFixture1!");
        await page.getByRole("button", { name: path === "aceptar-invitacion" ? "Activar mi cuenta" : "Actualizar contraseña" }).click();
      }
      expect((await operation).postDataJSON().token).toBe(token);
      expect(await page.evaluate(value => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(item => item.includes(value)), token)).toBe(false);
      if (transport === "#") expect(requests.some(url => url.includes(token))).toBe(false);
      if (path === "verificar-correo") await expect(page.getByText("Correo verificado", { exact: true })).toBeVisible();
    });
  }
}

test("Report-Only reports inline restrictions without blocking styles, fonts, Lottie or PWA", async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener("securitypolicyviolation", event => {
      if (event.disposition === "report") (window as unknown as { violations: string[] }).violations.push(event.effectiveDirective);
    });
  });
  await page.goto("/olvide-password");
  await expect(page.getByRole("heading", { name: "Olvidé mi contraseña" })).toBeVisible();
  await expect(page.locator(".button-back__animation svg")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe("loaded");
  await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active))).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as unknown as { violations: string[] }).violations.includes("script-src-elem"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.dataset.appStyles)).toBe("ready");
});

test("architecture runs scripts in an opaque sandbox with the real packaged diagram", async ({ page }) => {
  await mockApi(page, true);
  await page.route("**/admin/architecture", route => route.fulfill({ headers: cors, json: { moduleId: "01-auth-security", title: "Seguridad", revision: "fixture000", generatedAt: "2026-10-27",
    diagrams: [{ id: "architecture", title: "Componentes", description: "Resumen" }] } }));
  await page.route("**/admin/architecture/diagrams/architecture", route => route.fulfill({ headers: cors, contentType: "text/html",
    body: readFileSync("../backend/src/main/resources/architecture-diagrams/architecture.html", "utf8") }));
  await page.goto("/admin/arquitectura");
  await expect(page.locator("#architecture-frame")).toBeVisible();
  const frame = page.frameLocator("#architecture-frame");
  await expect(frame.locator("svg").first()).toBeVisible();
  expect(await page.locator("#architecture-frame").getAttribute("sandbox")).not.toContain("allow-same-origin");
  const child = page.frames().find(value => value.url() === "about:srcdoc")!;
  expect(await child.evaluate(() => { try { return Boolean(parent.document); } catch { return false; } })).toBe(false);
});

test("Allure HTML still executes inline/eval inside its isolated iframe", async ({ page }) => {
  await mockApi(page, true);
  await page.route("**/admin/quality-reports", route => route.fulfill({ headers: cors, json: { configured: true, reports: [{ id: "fixture", application: "frontend", suite: "combined", generatedAt: "2026-10-27",
    sha: "fixture000", tests: { total: 1, passed: 1, failed: 0, skipped: 0 }, coverage: {} }] } }));
  await page.route("**/admin/quality-reports/fixture/content", route => route.fulfill({ headers: cors, contentType: "text/html",
    body: '<!doctype html><html><head></head><body><div id="result"></div><script>document.getElementById("result").textContent=eval("2+2");</script></body></html>' }));
  await page.goto("/admin/reportes-calidad");
  await page.getByRole("button", { name: /Abrir reporte/ }).click();
  await expect(page.frameLocator("#quality-report-frame").locator("#result")).toHaveText("4");
  expect(await page.locator("#quality-report-frame").getAttribute("sandbox")).not.toContain("allow-same-origin");
});

test("API and STOMP WebSocket still connect after refresh", async ({ page }) => {
  const sockets = await mockApi(page, true);
  await page.goto("/admin/reportes-calidad");
  await expect.poll(() => sockets).toContain("ws://127.0.0.1:5055/tesoreria/ws");
  await expect(page.getByRole("heading", { name: "Reportes de calidad" })).toBeVisible();
});

test("PWA does not cache legacy URL credentials or reload an active account form", async ({ page }) => {
  await mockApi(page);
  await page.goto("/login");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.goto("/restablecer-password?token=phase4-cache-proof");
  await expect(page).toHaveURL("http://127.0.0.1:5186/restablecer-password");
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("BrowserFixture1!");
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event("controllerchange")));
  await expect(page.getByLabel("Nueva contraseña", { exact: true })).toHaveValue("BrowserFixture1!");
  const urls = await page.evaluate(async () => {
    const result: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        result.push(request.url, (await cache.match(request))?.url ?? "");
      }
    }
    return result;
  });
  expect(urls.some(url => url.includes("phase4-cache-proof"))).toBe(false);
});

test("clickjacking is blocked by the enforced headers", async ({ page }) => {
  await mockApi(page);
  await page.goto("/login");
  await page.evaluate(() => {
    const iframe = document.createElement("iframe");
    iframe.id = "hostile-frame";
    iframe.src = "/login";
    document.body.appendChild(iframe);
  });
  await expect.poll(() => page.evaluate(() => {
    const frame = document.querySelector<HTMLIFrameElement>("#hostile-frame");
    try { return Boolean(frame?.contentDocument?.querySelector("#root")); } catch { return false; }
  })).toBe(false);
});

// Optional full artifacts are produced by the existing private Allure workflow.
// The always-run test above covers sandbox/inline/eval without generated fixtures.
if (process.env.PHASE4_ALLURE_DIR) {
  for (const application of ["frontend", "backend"]) {
    test(`generated ${application} Allure report renders under the real headers`, async ({ page }) => {
      await mockApi(page, true);
      page.on("console", message => {
        if (message.type() === "error" && !message.text().includes("report-only")) console.error("Allure browser:", message.text().slice(0, 600));
      });
      const root = process.env.PHASE4_ALLURE_DIR!;
      const catalog = JSON.parse(readFileSync(`${root}/catalog.json`, "utf8"));
      const report = catalog.reports.find((entry: { application: string }) => entry.application === application);
      expect(report).toBeTruthy();
      await page.route("**/admin/quality-reports", route => route.fulfill({ headers: cors, json: { configured: true, reports: [report] } }));
      await page.route(`**/admin/quality-reports/${report.id}/content`, route => route.fulfill({ headers: cors, contentType: "text/html",
        body: readFileSync(`${root}/reports/${report.id}/index.html`, "utf8") }));
      await page.goto("/admin/reportes-calidad");
      await page.getByRole("button", { name: /Abrir reporte/ }).click();
      const frame = page.frameLocator("#quality-report-frame");
      await expect(frame.locator("#app")).toContainText(new RegExp(`Results\\s*${report.tests.total}`), { timeout: 30_000 });
      expect(await page.locator("#quality-report-frame").getAttribute("sandbox")).not.toContain("allow-same-origin");
    });
  }
}
