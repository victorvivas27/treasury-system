import { test, expect } from '@playwright/test';
import path from 'node:path';

test('funds can be edited and deleted with confirmation', async ({ page }) => {
  test.setTimeout(90000);
  const user = { id: 1, nombre: 'Administración', correo: 'admin@example.test', rol: 'ADMIN', profileImageType: 'INITIALS' };
  let fund = { id: 1, schoolYear: 2026, title: 'Transporte del paseo', defaultAmount: 10000, dueDate: null as string | null,
    incomeId: null, expected: 10000, collected: 4000, remaining: 6000, spent: 0, available: 4000,
    families: [{ familyId: 1, familyCode: 'FA-1', studentName: 'Alumno de prueba', guardian: 'Apoderado', course: '4A', expected: 10000, paid: 4000, remaining: 6000, status: 'PARTIAL' }], movements: [] };
  let removed = false;
  let deletes = 0;
  await page.route('https://storage.googleapis.com/**/app/v1/*', route => route.fulfill({
    path: path.resolve('public/app-images/v1', new URL(route.request().url()).pathname.split('/').pop()!),
  }));
  await page.route('**/api/v1/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint.endsWith('/recaudaciones/1/eliminacion')) {
      expect(route.request().postDataJSON()).toEqual({ reason: 'Fondo duplicado' });
      deletes++; removed = true; return route.fulfill({ status: 200, body: '' });
    }
    if (endpoint.endsWith('/recaudaciones/1') && route.request().method() === 'PUT') {
      fund = { ...fund, ...route.request().postDataJSON() }; return route.fulfill({ json: fund });
    }
    if (endpoint.endsWith('/recaudaciones')) return route.fulfill({ json: removed ? [] : [fund] });
    return route.fulfill({ json: endpoint.endsWith('/auth/refresh') ? { token: 'preview-test', user }
      : endpoint.endsWith('/auth/me') ? user
      : endpoint.endsWith('/configuracion-general/curso') ? { course: '4A', schoolYear: 2026, history: [] } : [] });
  });
  await page.goto('/tesoreria/fondos-por-actividad?loaderDelay=0', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Fondos por actividad' })).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.home-entry-transition')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Editar fondo', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre', { exact: true }).fill('Camisetas del curso');
  await dialog.getByLabel('Fecha objetivo (opcional)').fill('2026-12-01');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Camisetas del curso' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('funds.png') });
  await page.getByRole('button', { name: 'Eliminar fondo', exact: true }).click();
  await expect(dialog).toContainText('se anularán sus ingresos y egresos vinculados');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(deletes).toBe(0);
  await page.getByRole('button', { name: 'Eliminar fondo', exact: true }).click();
  await dialog.getByLabel('Motivo').fill('Fondo duplicado');
  await dialog.getByRole('button', { name: 'Eliminar fondo', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Crear el primer fondo' })).toBeVisible();
  expect(deletes).toBe(1);
});
