import { test, expect } from '@playwright/test';
import path from 'node:path';

test('users read funds and both guardian profiles show one shared family payment', async ({ page }) => {
  test.setTimeout(90000);
  let secondary = false;
  let mutations = 0;
  const family = { familyId: 1, familyCode: 'FA-1', studentName: 'Alumno de prueba', guardian: 'Padre de prueba',
    course: '4A', expected: 1500, paid: 1500, remaining: 0, status: 'PAID' };
  const payment = { requestId: 'payment-1', familyId: 1, incomeId: null, expenseId: null, amount: 1500,
    date: '2026-01-01', recordedAt: '2026-01-01T15:00:00Z', reference: 'Pago familiar compartido', recipient: null, active: true };
  const fund = { id: 1, schoolYear: 2026, title: 'Paseo del curso', defaultAmount: 1500, dueDate: null, incomeId: null,
    expected: 1500, collected: 1500, remaining: 0, spent: 0, available: 1500, families: [family], movements: [payment] };
  await page.route('https://storage.googleapis.com/**/app/v1/*', route => route.fulfill({
    path: path.resolve('public/app-images/v1', new URL(route.request().url()).pathname.split('/').pop()!),
  }));
  await page.route('**/api/v1/**', route => {
    const endpoint = new URL(route.request().url()).pathname;
    const user = { id: secondary ? 2 : 1, nombre: secondary ? 'Madre de prueba' : 'Padre de prueba',
      correo: secondary ? 'madre@example.test' : 'padre@example.test', rol: 'USER', profileImageType: 'INITIALS', enabled: true };
    if (endpoint.includes('/recaudaciones') && !['GET', 'HEAD'].includes(route.request().method())) mutations++;
    const json = endpoint.endsWith('/auth/refresh') ? { token: 'readonly-test', user }
      : endpoint.endsWith('/auth/me') ? user
      : endpoint.endsWith('/configuracion-general/curso') ? { course: '4A', schoolYear: 2026, history: [] }
      : endpoint.endsWith('/recaudaciones') ? [fund]
      : endpoint.endsWith('/tesoreria/perfil') ? { familyId: 1, familyCode: 'FA-1', studentName: 'Alumno de prueba',
        relationship: secondary ? 'Madre' : 'Padre', primaryGuardian: !secondary, obligations: [],
        activityFunds: [{ id: 1, title: fund.title, expected: 1500, paid: 1500, remaining: 0, status: 'PAID', payments: [payment] }] }
      : [];
    return route.fulfill({ json });
  });
  await page.goto('/tesoreria/fondos-por-actividad?loaderDelay=0', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Fondos por actividad' })).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/Solo lectura/)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Pagó Alumno de prueba' })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Pagó Alumno de prueba' })).toBeChecked();
  for (const name of ['Nuevo fondo', 'Editar fondo', 'Eliminar fondo', 'Cerrar y dar ingreso', 'Registrar pago al proveedor']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  await page.locator('.collections-table').screenshot({ path: test.info().outputPath('user-funds.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const isSecondary of [false, true]) {
    secondary = isSecondary;
    await page.goto('/profile?loaderDelay=0', { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: secondary ? 'Madre de prueba' : 'Padre de prueba' })).toBeVisible();
    await expect(page.getByText(secondary ? 'Apoderado secundario' : 'Apoderado principal', { exact: true })).toBeVisible();
    const section = page.getByRole('region', { name: 'Fondos por actividad' });
    await expect(section.getByText(/Recibido:.*1.500/)).toBeVisible();
    await section.getByText('Paseo del curso', { exact: true }).click();
    await expect(section.getByRole('listitem')).toHaveCount(1);
    await expect(section.getByText('Pago familiar compartido')).toBeVisible();
    await expect(section.getByRole('button')).toHaveCount(0);
    await section.screenshot({ path: test.info().outputPath(`profile-${secondary ? 'secondary' : 'primary'}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(mutations).toBe(0);
});
