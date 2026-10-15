// Synthetic API fixtures only; no production writes.
import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1216, height: 552 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
test(`${viewport.width}px: guarda Matemática 08:00–09:00 sin perder otro día pendiente y confirma junto al botón`, async ({ page }) => {
  await page.setViewportSize(viewport);
  const user = { id: 77, nombre: "Administrador de prueba", correo: "horario@example.test", rol: "ADMIN",
    enabled: true, accountNonLocked: true, emailVerifiedAt: "2026-01-01T00:00:00", profileImageType: "INITIALS" };
  const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2_000_000_000 })).toString("base64url")}.test`;
  let stored = { days: [
    { dayOfWeek: 1, entryTime: "07:50", exitTime: "15:30", blocks: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "08:45", type: "SUBJECT", name: "Matemática", order: 0, color: null },
    ] },
    { dayOfWeek: 2, entryTime: "07:50", exitTime: "15:30", blocks: [] },
  ] };
  let writes = 0;
  await page.route("**/tesoreria/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path.endsWith("/auth/refresh")) body = { token, user, csrfToken: "test-csrf" };
    else if (path.endsWith("/auth/me")) body = user;
    else if (path.endsWith("/academic/schedules/periods")) body = [{ schoolYear: 2026, course: "Curso de prueba", editable: true }];
    else if (path.endsWith("/academic/schedules/2026/draft")) body = stored;
    else if (path.endsWith("/academic/schedules/2026") && route.request().method() === "PUT") {
      stored = route.request().postDataJSON(); writes++; body = stored;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/admin/horario-clases");
  await expect(page.getByRole("heading", { name: "Gestión del horario" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: /Bienvenido/ })).toBeVisible();
  await page.getByRole("button", { name: "Omitir" }).click();
  await expect(page.getByRole("button", { name: "Lunes", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Ingreso", { exact: true })).toBeVisible();
  await page.screenshot({ path: `demo-output/schedule-save/daily-${viewport.width}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Editar Lunes bloque 1" }).click();
  await page.getByLabel("Fin Lunes bloque 1 · Hora", { exact: true }).selectOption("09");
  await page.getByLabel("Fin Lunes bloque 1 · Minutos", { exact: true }).selectOption("00");
  const tuesday = page.locator(".schedule-day").filter({ has: page.getByRole("heading", { name: "Martes", exact: true }) });
  await page.getByRole("button", { name: "Martes", exact: true }).click();
  await tuesday.getByRole("button", { name: "Añadir bloque" }).click();
  await page.getByLabel("Nombre Martes bloque 1", { exact: true }).fill("Pendiente");
  await page.getByRole("button", { name: "Lunes", exact: true }).click();
  await page.getByRole("button", { name: "Guardar jornada · Lunes", exact: true }).click();
  await expect(page.getByText("Lunes guardado como borrador.", { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  expect(stored.days[0].blocks[0]).toMatchObject({ name: "Matemática", startTime: "08:00", endTime: "09:00" });
  expect(stored.days[1].blocks).toHaveLength(0);
  await page.getByRole("button", { name: "Martes", exact: true }).click();
  await page.getByRole("button", { name: "Editar Martes bloque 1", exact: true }).click();
  await expect(page.getByLabel("Nombre Martes bloque 1", { exact: true })).toHaveValue("Pendiente");
  await page.screenshot({ path: `demo-output/schedule-save/saved-math-${viewport.width}.png`, fullPage: true });
});
}
