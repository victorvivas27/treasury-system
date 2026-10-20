import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1216, height: 552 }]) {
  test(`families management at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const user = { id: 77, nombre: "Admin de prueba", correo: "families@example.test", rol: "ADMIN",
      enabled: true, accountNonLocked: true, emailVerifiedAt: "2026-01-01T00:00:00", profileImageType: "INITIALS" };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2_000_000_000 })).toString("base64url")}.test`;
    const alumno = { alumnoId: 1, codigo: "AL-00000001", activo: true, nombre: "María Fernanda Apellido Compuesto", curso: "1A", genero: "FEMENINO" };
    const apoderado = { apoderadoId: 1, codigo: "AP-00000001", activo: true, nombre: "María de los Ángeles Apellido Compuesto",
      email: "familia@example.test", telefono: "+56912345678", relacion: { parentesco: "Madre", esPrincipal: true } };
    const familia = { familiaId: 1, codigoFamilia: "FAM-00000001", activo: true, alumno,
      apoderados: [apoderado], observacionesGenerales: "" };
    const paged = (content: unknown[]) => ({ content, page: 0, size: 3, totalPages: 1, totalElements: content.length });
    await page.route("**/tesoreria/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path.endsWith("/auth/refresh")) body = { token, user, csrfToken: "test-csrf" };
      else if (path.endsWith("/auth/me")) body = user;
      else if (path.endsWith("/configuracion-general/curso")) body = { course: "1A", schoolYear: 2026, history: [] };
      else if (path.endsWith("/familias")) body = paged([familia]);
      else if (path.endsWith("/familias/1")) body = familia;
      else if (path.endsWith("/alumnos")) body = paged([alumno]);
      else if (path.endsWith("/apoderados")) body = paged([apoderado]);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/family");
    const title = page.getByRole("heading", { name: "Lista de Familias", exact: true });
    await expect(title).toBeVisible();
    await expect(page.locator("#app-boot-loader")).toHaveCount(0);
    await expect(page.getByText(alumno.nombre, { exact: true })).toBeVisible();
    if (viewport.width < 769) {
      const before = await title.boundingBox();
      await page.getByRole("button", { name: "Buscar por nombre", exact: true }).click();
      await expect(page.getByRole("searchbox")).toBeVisible();
      expect(await title.boundingBox()).toEqual(before);
      await page.getByRole("button", { name: "Cerrar búsqueda", exact: true }).click();
      expect(await page.getByTestId("edit-btn-1").evaluate(element => element.getBoundingClientRect().height)).toBe(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `demo-output/families-${viewport.width}.png`, fullPage: true });
    } else {
      await expect(page.locator(".familia-table thead")).toBeVisible();
      expect(await page.getByTestId("edit-btn-1").evaluate(element => element.getBoundingClientRect().height)).toBe(28);
    }
    await page.getByTestId("edit-btn-1").click();
    await expect(page.getByRole("heading", { name: "Modificar datos de la familia", exact: true })).toBeVisible();
    await expect(page.getByText(familia.codigoFamilia, { exact: true })).toBeVisible();
    if (viewport.width < 769) {
      for (const mode of ["edit", "create"]) {
        const editor = page.locator(mode === "edit" ? ".familia-edit-page" : ".familia-create-page");
        expect(await editor.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(320);
        await expect(page.getByRole("button", { name: "Volver", exact: true })).toHaveCount(0);
        const relationship = page.getByRole("button", { name: "Parentesco del apoderado 1", exact: true });
        await relationship.click();
        const options = page.getByRole("listbox");
        await expect(options).toBeVisible();
        const bounds = await options.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
        await page.getByRole("option", { name: "Madre", exact: true }).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `demo-output/family-${mode}-${viewport.width}.png`, fullPage: true });
        await page.getByRole("button", { name: "Cancelar", exact: true }).click();
        if (mode === "edit") {
          await page.goto("/family/new");
          await expect(page.getByRole("heading", { name: "Crear familia", exact: true })).toBeVisible();
          await expect(page.locator("#app-boot-loader")).toHaveCount(0);
        }
      }
    }
  });
}
