import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1216, height: 552 }]) {
  test(`guardian list at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const user = { id: 77, nombre: "Admin de prueba", correo: "guardians@example.test", rol: "ADMIN",
      enabled: true, accountNonLocked: true, emailVerifiedAt: "2026-01-01T00:00:00", profileImageType: "INITIALS" };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2_000_000_000 })).toString("base64url")}.test`;
    const guardians = ["SIN_ACCESO", "ACTIVO", "INVITACION_PENDIENTE"].map((accessStatus, index) => ({
      apoderadoId: index + 1, codigo: `AP-0000000${index + 1}`, activo: true, accessStatus,
      nombre: index === 0 ? "María Fernanda de los Ángeles Apellido Compuesto" : `Apoderado ${index + 1}`,
      email: index === 0 ? "un.correo.muy.largo.para.validar.el.espacio@example.test" : `apoderado${index}@example.test`,
      telefono: "+56 9 1234 5678",
    }));
    await page.route("**/tesoreria/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path.endsWith("/auth/refresh")) body = { token, user, csrfToken: "test-csrf" };
      else if (path.endsWith("/auth/me")) body = user;
      else if (path.endsWith("/configuracion-general/curso")) body = { course: "1A", schoolYear: 2026 };
      else if (path.endsWith("/apoderados")) body = { content: guardians, page: 0, size: 3, totalPages: 1, totalElements: 3 };
      else if (path.endsWith("/apoderados/AP-00000001")) body = { ...guardians[0], observaciones: "" };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/parents");
    await expect(page.getByRole("heading", { name: "Gestión de Apoderados" })).toBeVisible();
    await expect(page.locator("#app-boot-loader")).toHaveCount(0);
    const rows = page.locator(".apoderados-table tbody > tr:not(.empty-row)");
    await expect(rows).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Habilitar acceso", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Reenviar invitación", exact: true })).toHaveCount(1);
    if (viewport.width < 769) {
      const title = page.getByRole("heading", { name: "Lista de Apoderados", exact: true });
      const beforeSearch = await title.boundingBox();
      await page.getByRole("button", { name: "Buscar por nombre", exact: true }).click();
      await expect(page.getByRole("searchbox", { name: "Buscar por nombre" })).toBeVisible();
      expect(await title.boundingBox()).toEqual(beforeSearch);
      await page.getByRole("button", { name: "Cerrar búsqueda", exact: true }).click();
      const sizes = await page.locator(".apoderados-table__action-button").evaluateAll(buttons =>
        buttons.map(button => button.getBoundingClientRect().height));
      expect(sizes.every(height => height >= 44)).toBe(true);
      expect(await rows.first().locator('[data-label="Nombre"]').evaluate(element => getComputedStyle(element).order)).toBe("-1");
      expect(await rows.evaluateAll(elements => elements.every(element => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && element.scrollWidth <= element.clientWidth;
      }))).toBe(true);
    } else {
      await expect(page.locator(".apoderados-table thead")).toBeVisible();
      expect(await page.getByTestId("edit-btn-1").evaluate(element => element.getBoundingClientRect().height)).toBe(28);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `demo-output/guardians-${viewport.width}.png`, fullPage: true });
    await page.getByTestId("edit-btn-1").click();
    await expect(page).toHaveURL(/AP-00000001/);
    await expect(page.getByLabel("Nombre completo", { exact: true })).toHaveValue(guardians[0].nombre);
    if (viewport.width < 769) {
      const editor = page.locator(".apoderado-edit-page");
      expect(await editor.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(320);
      await page.getByLabel("Nombre completo", { exact: true }).focus();
      await expect.poll(() => page.locator('label[for="nombre_input"]').evaluate(element => getComputedStyle(element).transform)).toBe("none");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `demo-output/guardian-edit-${viewport.width}.png` });
      await expect(page.getByRole("button", { name: "Volver", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await page.getByRole("button", { name: "Crear Apoderado", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Nuevo Apoderado" })).toBeVisible();
      expect(await page.locator(".apoderado-create-page").evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(320);
      await expect(page.getByRole("button", { name: "Volver", exact: true })).toHaveCount(0);
      await page.getByLabel("Email", { exact: true }).fill("nuevo@example.test");
      await expect.poll(() => page.locator('label[for="email_input"]').evaluate(element => getComputedStyle(element).transform)).toBe("none");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `demo-output/guardian-create-${viewport.width}.png` });
    }
  });
}
