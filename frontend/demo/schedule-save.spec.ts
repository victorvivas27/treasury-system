import { expect, test } from "@playwright/test";

test("guarda Matemática 07:00–09:00 sin perder otro día pendiente y confirma junto al botón", async ({ page }) => {
  const user = { id: 77, nombre: "Administrador de prueba", correo: "horario@example.test", rol: "ADMIN",
    enabled: true, accountNonLocked: true, emailVerifiedAt: "2026-01-01T00:00:00", profileImageType: "INITIALS" };
  const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2_000_000_000 })).toString("base64url")}.test`;
  let stored = { days: [
    { dayOfWeek: 1, entryTime: "07:00", exitTime: "15:30", blocks: [
      { dayOfWeek: 1, startTime: "07:00", endTime: "08:00", type: "SUBJECT", name: "Matemática", order: 0, color: null },
    ] },
    { dayOfWeek: 2, entryTime: "07:00", exitTime: "15:30", blocks: [] },
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
  await expect(page.getByRole("button", { name: "Desplegar Lunes" })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Desplegar Lunes" }).click();
  await page.getByRole("button", { name: "Editar Lunes bloque 1" }).click();
  await page.getByLabel("Fin Lunes bloque 1 · Hora", { exact: true }).selectOption("09");
  const tuesday = page.locator(".schedule-day").filter({ has: page.getByRole("heading", { name: "Martes", exact: true }) });
  await page.getByRole("button", { name: "Desplegar Martes" }).click();
  await tuesday.getByRole("button", { name: "Añadir bloque" }).click();
  await page.getByLabel("Nombre Martes bloque 1", { exact: true }).fill("Pendiente");
  await page.getByRole("button", { name: "Guardar jornada · Lunes", exact: true }).click();
  await expect(page.getByText("Lunes guardado como borrador.", { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  expect(stored.days[0].blocks[0]).toMatchObject({ name: "Matemática", startTime: "07:00", endTime: "09:00" });
  expect(stored.days[1].blocks).toHaveLength(0);
  await page.getByRole("button", { name: "Editar Martes bloque 1", exact: true }).click();
  await expect(page.getByLabel("Nombre Martes bloque 1", { exact: true })).toHaveValue("Pendiente");
  await page.screenshot({ path: "demo-output/schedule-save/saved-math.png", fullPage: true });
});
