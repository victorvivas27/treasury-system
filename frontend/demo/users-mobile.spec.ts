import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1216, height: 552 }]) {
  test(`users management at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const user = { id: 77, nombre: "Admin de prueba", correo: "users@example.test", rol: "ADMIN",
      enabled: true, accountNonLocked: true, emailVerifiedAt: "2026-01-01T00:00:00", profileImageType: "INITIALS" };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2_000_000_000 })).toString("base64url")}.test`;
    const listed = { ...user, id: 88, code: "US-00000088", nombre: "María Fernanda de los Ángeles Apellido Compuesto",
      correo: "un.correo.muy.largo.para.probar.el.espacio@example.test" };
    await page.route("**/tesoreria/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path.endsWith("/auth/refresh")) body = { token, user, csrfToken: "test-csrf" };
      else if (path.endsWith("/auth/me")) body = user;
      else if (path.endsWith("/configuracion-general/curso")) body = { course: "1A", schoolYear: 2026, history: [] };
      else if (path.endsWith("/users")) body = { content: [listed], page: 0, size: 5, totalPages: 1, totalElements: 1 };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/users");
    const title = page.getByRole("heading", { name: "Lista de Usuarios", exact: true });
    await expect(title).toBeVisible();
    await expect(page.locator("#app-boot-loader")).toHaveCount(0);
    await expect(page.getByText(listed.nombre, { exact: true })).toBeVisible();
    if (viewport.width < 769) {
      const before = await title.boundingBox();
      await page.getByRole("button", { name: "Buscar por nombre", exact: true }).click();
      await expect(page.getByRole("searchbox")).toBeVisible();
      expect(await title.boundingBox()).toEqual(before);
      await page.getByRole("button", { name: "Cerrar búsqueda", exact: true }).click();
      expect(await page.getByTestId("edit-btn-88").evaluate(element => element.getBoundingClientRect().height)).toBe(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `demo-output/users-${viewport.width}.png`, fullPage: true });
    } else {
      await expect(page.locator(".usuarios-table thead")).toBeVisible();
      expect(await page.getByTestId("edit-btn-88").evaluate(element => element.getBoundingClientRect().height)).toBe(28);
    }
    await page.getByTestId("edit-btn-88").click();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(listed.nombre);
    if (viewport.width < 769) {
      for (const mode of ["edit", "create"]) {
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        expect(await dialog.evaluate(element => element.matches(":modal"))).toBe(true);
        expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
        await dialog.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
        const modalBox = await dialog.boundingBox();
        expect(modalBox!.width).toBeLessThanOrEqual(320);
        expect(modalBox!.height).toBeLessThanOrEqual(viewport.height - 24);
        if (mode === "edit") {
          await expect(page.getByRole("heading", { name: "Modificar datos del usuario", exact: true })).toBeVisible();
          await expect(title).toBeVisible();
        }
        expect(await page.locator(".user-form").evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(320);
        await page.getByLabel("Nombre", { exact: true }).focus();
        await expect.poll(() => page.locator('label[for="user-form-nombre"]').evaluate(element => getComputedStyle(element).transform)).toBe("none");
        if (mode === "create") {
          await expect(page.getByRole("heading", { name: "Nuevo usuario", exact: true })).toBeVisible();
          await expect(title).toBeVisible();
          const requirementRows = await page.locator(".password-strength__requirements li").evaluateAll(elements =>
            elements.map(element => Math.round(element.getBoundingClientRect().top)));
          expect(requirementRows[0]).toBe(requirementRows[1]);
          expect(new Set(requirementRows).size).toBe(3);
          const password = page.getByLabel("Contraseña", { exact: true });
          await expect(password).toHaveAttribute("type", "password");
          await page.getByRole("button", { name: "Mostrar contraseña", exact: true }).click();
          await expect(password).toHaveAttribute("type", "text");
          await expect(page.getByRole("button", { name: "Mostrar contraseña repetida", exact: true })).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `demo-output/user-${mode}-${viewport.width}.png`, fullPage: true });
        await page.getByRole("button", { name: "Cancelar", exact: true }).click();
        await expect(page.locator(".user-form")).toHaveCount(0);
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
        await expect(title).toBeVisible();
        if (mode === "edit") await page.getByRole("button", { name: "Crear usuario", exact: true }).click();
      }
    }
  });
}
