import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1216, height: 552 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
  test(`consulta del horario a ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const user = { id: 77, nombre: "Consulta de prueba", correo: "horario@example.test", rol: "ADMIN",
      enabled: true, accountNonLocked: true, emailVerifiedAt: "2026-01-01T00:00:00", profileImageType: "INITIALS" };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2_000_000_000 })).toString("base64url")}.test`;
    // Synthetic published schedule; the test never writes to a real API.
    const days = Array.from({ length: 5 }, (_, index) => ({ dayOfWeek: index + 1, entryTime: "07:50", exitTime: index === 4 ? "12:30" : "15:30",
      blocks: [
        { startTime: "08:00", endTime: "08:45", name: "Matemática", type: "SUBJECT", color: null },
        { startTime: "08:45", endTime: "09:30", name: "Matemática", type: "SUBJECT", color: "#5276df" },
        { startTime: "09:30", endTime: "09:45", name: null, type: "BREAK", color: null },
        { startTime: "09:45", endTime: "10:30", name: "Lenguaje", type: "SUBJECT", color: null },
        { startTime: "10:30", endTime: "11:15", name: "Inglés", type: "SUBJECT", color: null },
        { startTime: "11:15", endTime: "12:00", name: null, type: "LUNCH", color: null },
      ].map((block, order) => ({ ...block, order, dayOfWeek: index + 1 })) }));
    await page.route("**/tesoreria/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path.endsWith("/auth/refresh")) body = { token, user, csrfToken: "test-csrf" };
      else if (path.endsWith("/auth/me")) body = user;
      else if (path.endsWith("/academic/schedules/periods")) body = [{ schoolYear: 2026, course: "Curso de prueba", editable: true }];
      else if (path.endsWith("/academic/schedules/2026")) {
        expect(route.request().method()).toBe("GET");
        body = { days };
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/calendario/horario-clases");
    await page.getByRole("button", { name: "Omitir" }).click();
    await expect(page.getByRole("heading", { name: "Horario de clases" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Por día", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Ingreso", { exact: true })).toBeVisible();
    await expect(page.getByText("Matemática", { exact: true })).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `demo-output/schedule-published/day-${viewport.width}.png`, fullPage: true });
    await page.locator(".schedule-day-nav").evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY + 180));
    await expect.poll(() => page.locator(".schedule-day-nav").evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(0);
    await expect(page.getByRole("button", { name: "Viernes", exact: true })).toBeInViewport();
    await page.screenshot({ path: `demo-output/schedule-published/sticky-days-${viewport.width}.png` });
    await page.getByRole("button", { name: "Viernes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Viernes", exact: true })).toBeVisible();
    await expect(page.locator(".schedule-agenda-exit")).toContainText("12:30");
    await page.getByRole("button", { name: "Semanal resumida", exact: true }).click();
    await expect(page.locator(".schedule-agenda")).toHaveCount(5);
    await expect(page.locator(".schedule-agenda--compact .schedule-agenda-card > svg").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `demo-output/schedule-published/week-${viewport.width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Tabla semanal", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator(".schedule-table-block-heading > svg").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `demo-output/schedule-published/table-${viewport.width}.png`, fullPage: true });
  });
}
