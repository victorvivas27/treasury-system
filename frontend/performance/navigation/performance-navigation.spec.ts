import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { getPerformanceEnv } from "../helpers/performanceEnv";
import {
  createMetricsCollector,
  writeReports,
  type NavigationMetric,
} from "../helpers/performanceMetrics";

const env = getPerformanceEnv();

interface ScreenDefinition {
  name: string;
  path: string;
  readySelector: string;
  navigate: (page: Page) => Promise<"ok" | "skipped">;
}

const clickSidebarLink = async (page: Page, pathValue: string) => {
  await dismissAppTour(page);
  const link = page.locator(`[data-tour-path="${pathValue}"]`).first();
  if (await link.count() === 0 || !(await link.isVisible().catch(() => false))) return "skipped";
  await link.click();
  return "ok";
};

const dismissAppTour = async (page: Page) => {
  const tour = page.locator(".app-tour").first();
  if (await tour.count() === 0 || !(await tour.isVisible().catch(() => false))) return;

  const skip = tour.getByRole("button", { name: /Omitir|Finalizar/i }).first();
  if (await skip.count() > 0 && await skip.isVisible().catch(() => false)) {
    await skip.click();
    await expect(tour).toBeHidden({ timeout: 5_000 });
  }
};

const screens: ScreenDefinition[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
    readySelector: ".business-dashboard",
    navigate: (page) => clickSidebarLink(page, "/dashboard"),
  },
  {
    name: "Alumnos",
    path: "/students",
    readySelector: ".alumnos-page",
    navigate: (page) => clickSidebarLink(page, "/students"),
  },
  {
    name: "Apoderados",
    path: "/parents",
    readySelector: ".apoderados-page",
    navigate: (page) => clickSidebarLink(page, "/parents"),
  },
  {
    name: "Tesoreria",
    path: "/tesoreria",
    readySelector: "main",
    navigate: async (page) => {
      const button = page.locator('[data-tour="treasury"]').first();
      await dismissAppTour(page);
      if (await button.count() === 0 || !(await button.isVisible().catch(() => false))) return "skipped";
      await button.click();
      const link = page.locator(
        'a[href="/tesoreria/ingresos"], a[href="/tesoreria/pagos"], ' +
        'a[href="/tesoreria/gastos"], a[href="/tesoreria/stands"]',
      ).first();
      if (await link.count() === 0 || !(await link.isVisible().catch(() => false))) return "skipped";
      await link.click();
      return "ok";
    },
  },
];

const waitForScreenReady = async (page: Page, selector: string) => {
  await expect(page.locator(selector).first()).toBeVisible();
  await page.waitForFunction(() => {
    const main = document.querySelector("main");
    if (!main) return false;
    const text = (main.textContent ?? "").toLowerCase();
    const hasSkeleton = document.querySelector(".skeleton-block") != null;
    const hasLoadingText = text.includes("cargando") || text.includes("actualizando");
    return !hasSkeleton && !hasLoadingText;
  }, undefined, { timeout: 25_000 }).catch(() => undefined);
  await page.waitForLoadState("domcontentloaded");
};

const login = async (page: Page) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#login-correo").fill(env.username);
  await page.locator("#login-password").fill(env.password);
  await page.getByRole("button", { name: /Ingresar/i }).click();
  await page.locator("#login-password").evaluate((element) => {
    (element as HTMLInputElement).value = "";
  }).catch(() => undefined);
  await expect(page).not.toHaveURL(/\/login(?:$|\?)/, { timeout: 30_000 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.locator("nav.sidebar-nav").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".business-dashboard").first()).toBeVisible({ timeout: 30_000 });
  await dismissAppTour(page);
};

test.describe.configure({ mode: "serial" });

test("production navigation performance audit", async ({ browser }) => {
  const navigation: NavigationMetric[] = [];

  for (let iteration = 1; iteration <= env.iterations; iteration += 1) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const collector = createMetricsCollector(page);

    collector.setScreen("Login");
    const loginStarted = performance.now();
    await login(page);
    const loginRequests = await collector.take("Login");
    navigation.push({
      iteration,
      screen: "Login",
      path: "/login",
      status: "ok",
      durationMs: Math.round(performance.now() - loginStarted),
      requestCount: loginRequests.length,
      transferBytes: loginRequests.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0),
      endpoints: loginRequests,
    });

    for (const screen of screens) {
      collector.setScreen(screen.name);
      const started = performance.now();
      const result = await screen.navigate(page);

      if (result === "skipped") {
        navigation.push({
          iteration,
          screen: screen.name,
          path: screen.path,
          status: "skipped",
          reason: "Navigation link was not visible for this user role.",
          requestCount: 0,
          transferBytes: 0,
          endpoints: [],
        });
        continue;
      }

      await expect(page).toHaveURL(new RegExp(`${screen.path.replaceAll("/", "\\/")}`), { timeout: 30_000 });
      await waitForScreenReady(page, screen.readySelector);
      const requests = await collector.take(screen.name);

      if (iteration === 1) {
        await page.screenshot({
          path: path.resolve(
            process.cwd(),
            "performance",
            "screenshots",
            `${screen.name.toLowerCase().replaceAll(" ", "-")}.png`,
          ),
          fullPage: true,
        });
      }

      navigation.push({
        iteration,
        screen: screen.name,
        path: screen.path,
        status: "ok",
        durationMs: Math.round(performance.now() - started),
        requestCount: requests.length,
        transferBytes: requests.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0),
        endpoints: requests,
      });
    }

    await context.close();
  }

  const report = await writeReports(env.baseUrl, env.iterations, navigation);
  expect(report.unsafeRequests, "Production audit must not perform write operations after login").toEqual([]);
});
