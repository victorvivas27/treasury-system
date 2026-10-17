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
    if (viewport.width === 1216) {
      const treasury = page.locator('[aria-controls="treasury-submenu"]');
      await treasury.hover();
      await expect(page.getByRole("tooltip", { name: "Tesorería", exact: true })).toBeVisible();
      await treasury.click();
      await expect(treasury).toHaveAttribute("aria-expanded", "true");
      await page.locator("#treasury-submenu a").first().hover();
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await expect(page.locator(".sidebar-treasury-timer")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.locator(".sidebar-treasury-timer")).toHaveCount(0);
      const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
      await toggle.click();
      await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar--collapsed/);
      await treasury.hover();
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await page.locator('.sidebar-footer-link[href="/notifications"]').hover();
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await toggle.click();
      await expect(page.locator(".sidebar")).toHaveClass(/sidebar--collapsed/);
    }
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
    if (viewport.width === 1216) {
      const cards = await page.locator(".schedule-agenda--compact").evaluateAll(elements => elements.map(element => {
        const { x, y, width } = element.getBoundingClientRect();
        return { x, y, width };
      }));
      expect(new Set(cards.map(card => Math.round(card.y))).size).toBe(1);
      expect(cards.every((card, index) => index === 0 || card.x >= cards[index - 1].x + cards[index - 1].width)).toBe(true);
    }
    const monday = page.getByRole("button", { name: "Lunes", exact: true });
    await monday.click();
    await expect(monday).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => page.locator(".schedule-agenda-content").first().evaluate(element => element.getBoundingClientRect().height)).toBe(0);
    await expect(page.getByRole("button", { name: "Martes", exact: true })).toHaveAttribute("aria-expanded", "true");
    await monday.focus();
    await page.keyboard.press("Enter");
    await expect(monday).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => page.locator(".schedule-agenda-content").first().evaluate(element =>
      Math.abs(element.getBoundingClientRect().height - element.firstElementChild!.scrollHeight))).toBeLessThan(1);
    await expect(page.locator(".schedule-agenda--compact .schedule-agenda-card > svg").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `demo-output/schedule-published/week-${viewport.width}.png`, fullPage: true });
    if (viewport.width === 1216) {
      await page.locator(".schedule-agenda-toggle-heading").first().evaluate(element =>
        window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY + 140));
      await expect.poll(() => page.locator(".schedule-agenda-toggle-heading").evaluateAll(elements =>
        elements.map(element => Math.round(element.getBoundingClientRect().top)))).toEqual([12, 12, 12, 12, 12]);
      expect(await page.locator(".schedule-agenda-card").first().evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(0);
      expect(await page.locator(".schedule-agenda-toggle-heading").first().evaluate(element => {
        const cover = getComputedStyle(element, "::before");
        return cover.height === "12px" && cover.top === "-12px" && cover.backgroundColor !== "rgba(0, 0, 0, 0)";
      })).toBe(true);
      expect(await page.locator(".schedule-agenda-toggle-heading").first().evaluate(element => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })).toBe(true);
      await page.screenshot({ path: "demo-output/schedule-published/sticky-week-1216.png" });
    }
    await page.getByRole("button", { name: "Tabla semanal", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator(".schedule-table-block-heading > svg").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `demo-output/schedule-published/table-${viewport.width}.png`, fullPage: true });
  });
}
