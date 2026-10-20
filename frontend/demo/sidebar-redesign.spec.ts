import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1216, height: 552 }, { width: 390, height: 844 }, { width: 360, height: 640 }]) {
  test(`sidebar navigation at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const user = { id: 77, nombre: "Usuario de prueba", correo: "sidebar@example.test", rol: "ADMIN",
      enabled: true, accountNonLocked: true, emailVerifiedAt: "2026-01-01T00:00:00", profileImageType: "INITIALS" };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2_000_000_000 })).toString("base64url")}.test`;
    await page.route("**/tesoreria/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path.endsWith("/auth/refresh")) body = { token, user, csrfToken: "test-csrf" };
      else if (path.endsWith("/auth/me")) body = user;
      else if (path.endsWith("/configuracion-general/curso")) body = { course: "1A", schoolYear: 2026 };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/birthdays");
    await expect(page.getByRole("heading", { name: "Cumplea\u00f1os", exact: true })).toBeVisible();
    await expect(page.locator("#app-boot-loader")).toHaveCount(0);
    const sidebar = page.locator("#app-sidebar");
    const toggle = page.locator(".sidebar-state-toggle");
    if (viewport.width > 768) {
      await expect(sidebar).toHaveAttribute("data-state", "expanded");
      await expect.poll(() => page.locator(".main-content").evaluate(el => el.getBoundingClientRect().left)).toBe(216);
      await page.mouse.move(1000, 400);
      await expect(sidebar).toHaveAttribute("data-state", "expanded");
      await toggle.click();
      await expect(sidebar).toHaveAttribute("data-state", "icons");
      await page.locator('[aria-controls="treasury-submenu"]').click();
      await expect(sidebar).toHaveAttribute("data-state", "expanded");
    } else {
      await expect(sidebar).toHaveAttribute("data-state", "hidden");
      await toggle.click();
      await expect(sidebar).toHaveAttribute("data-state", "expanded");
      await expect(page.locator(".main-content")).toHaveAttribute("inert", "");
      await page.locator('[aria-controls="treasury-submenu"]').click();
    }
    const submenu = page.locator("#treasury-submenu");
    await expect(submenu).toBeVisible();
    const menuBox = await submenu.boundingBox();
    const sideBox = await sidebar.boundingBox();
    expect(menuBox!.x).toBeGreaterThanOrEqual(sideBox!.x);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(sideBox!.x + sideBox!.width);
    await page.locator('.sidebar-footer-link[href="/configuration"]').scrollIntoViewIfNeeded();
    await expect(page.locator('.sidebar-footer-link[href="/configuration"]')).toBeInViewport();
    await page.screenshot({ path: `demo-output/sidebar-${viewport.width}.png` });
    if (viewport.width <= 768) {
      await page.locator(".sidebar-backdrop").click({ position: { x: viewport.width - 10, y: 100 } });
      await expect(sidebar).toHaveAttribute("data-state", "hidden");
      await expect(page.locator(".main-content")).not.toHaveAttribute("inert", "");
      await toggle.click();
      await page.keyboard.press("Escape");
      await expect(sidebar).toHaveAttribute("data-state", "hidden");
      await expect(toggle).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
