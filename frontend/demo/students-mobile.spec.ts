import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1216, height: 552 }]) {
  test(`students management at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const user = { id: 77, nombre: "Admin de prueba", correo: "students@example.test", rol: "ADMIN",
      enabled: true, accountNonLocked: true, emailVerifiedAt: "2026-01-01T00:00:00", profileImageType: "INITIALS" };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2_000_000_000 })).toString("base64url")}.test`;
    const student = { alumnoId: 1, codigo: "AL-00000001", activo: true, nombre: "María Fernanda de los Ángeles Apellido Compuesto",
      curso: "1A", genero: "FEMENINO", fechaNacimiento: "2018-03-12", observacion: "Mensaje de prueba" };
    await page.route("**/tesoreria/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path.endsWith("/auth/refresh")) body = { token, user, csrfToken: "test-csrf" };
      else if (path.endsWith("/auth/me")) body = user;
      else if (path.endsWith("/configuracion-general/curso")) body = { course: "1A", schoolYear: 2026, history: [] };
      else if (path.endsWith("/alumnos")) body = { content: [student], page: 0, size: 3, totalPages: 1, totalElements: 1 };
      else if (path.endsWith("/alumnos/AL-00000001")) body = student;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/students");
    await expect(page.getByRole("heading", { name: "Lista de Alumnos", exact: true })).toBeVisible();
    await expect(page.locator("#app-boot-loader")).toHaveCount(0);
    await expect(page.getByText(student.nombre, { exact: true })).toBeVisible();
    if (viewport.width < 769) {
      const title = page.getByRole("heading", { name: "Lista de Alumnos", exact: true });
      const before = await title.boundingBox();
      await page.getByRole("button", { name: "Buscar por nombre", exact: true }).click();
      await expect(page.getByRole("searchbox")).toBeVisible();
      expect(await title.boundingBox()).toEqual(before);
      await page.getByRole("button", { name: "Cerrar búsqueda", exact: true }).click();
      expect(await page.getByTestId("edit-btn-AL-00000001").evaluate(element => element.getBoundingClientRect().height)).toBe(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `demo-output/students-${viewport.width}.png`, fullPage: true });
    } else {
      await expect(page.locator(".alumnos-table thead")).toBeVisible();
      expect(await page.getByTestId("edit-btn-AL-00000001").evaluate(element => element.getBoundingClientRect().height)).toBe(28);
    }
    await page.getByTestId("edit-btn-AL-00000001").click();
    await expect(page.getByLabel("Nombre completo", { exact: true })).toHaveValue(student.nombre);
    if (viewport.width < 769) {
      for (const mode of ["edit", "create"]) {
        const editor = page.locator(mode === "edit" ? ".alumno-edit-page" : ".alumno-create-page");
        expect(await editor.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(320);
        await expect(page.getByRole("button", { name: "Volver", exact: true })).toHaveCount(0);
        await page.getByLabel("Nombre completo", { exact: true }).focus();
        await expect.poll(() => page.locator('label[for="nombre_input"]').evaluate(element => getComputedStyle(element).transform)).toBe("none");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `demo-output/student-${mode}-${viewport.width}.png`, fullPage: true });
        await page.getByRole("button", { name: "Cancelar", exact: true }).click();
        if (mode === "edit") await page.goto("/students/new");
        if (mode === "edit") await expect(page.getByRole("heading", { name: "Nuevo alumno", exact: true })).toBeVisible();
      }
    }
  });
}
