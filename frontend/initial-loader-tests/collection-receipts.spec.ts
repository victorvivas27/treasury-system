import { test, expect } from '@playwright/test';
import path from 'node:path';

test('payment check accepts a receipt and exposes it in the history', async ({ page }) => {
  test.setTimeout(90000);
  const user = { id: 1, nombre: 'Administración', correo: 'admin@example.test', rol: 'ADMIN', profileImageType: 'INITIALS' };
  let paid = false;
  const fund = () => ({ id: 1, schoolYear: 2026, title: 'Paseo', defaultAmount: 10000, dueDate: null,
    incomeId: null, expected: 10000, collected: paid ? 10000 : 0, remaining: paid ? 0 : 10000, spent: 0, available: paid ? 10000 : 0,
    families: [{ familyId: 1, familyCode: 'FA-1', studentName: 'Ana', guardian: 'Apoderado', course: '4A', expected: 10000, paid: paid ? 10000 : 0, remaining: paid ? 0 : 10000, status: paid ? 'PAID' : 'PENDING' }],
    movements: paid ? [{ requestId: 'receipt-test', familyId: 1, incomeId: null, expenseId: null, amount: 10000, date: '2026-01-01', reference: '', recipient: null, active: true }] : [] });
  await page.route('https://storage.googleapis.com/**/app/v1/*', route => route.fulfill({
    path: path.resolve('public/app-images/v1', new URL(route.request().url()).pathname.split('/').pop()!),
  }));
  await page.route('**/api/v1/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint.endsWith('/familias/1/pagos')) {
      expect(route.request().headers()['content-type']).toContain('multipart/form-data');
      expect(route.request().postDataBuffer()?.toString()).toContain('pago.pdf');
      paid = true; return route.fulfill({ json: fund() });
    }
    if (endpoint.endsWith('/recaudaciones/1/comprobantes')) return route.fulfill({ json: paid ? [{ requestId: 'receipt-test', originalName: 'pago.pdf' }] : [] });
    if (endpoint.endsWith('/recaudaciones')) return route.fulfill({ json: [fund()] });
    return route.fulfill({ json: endpoint.endsWith('/auth/refresh') ? { token: 'preview-test', user }
      : endpoint.endsWith('/auth/me') ? user
      : endpoint.endsWith('/configuracion-general/curso') ? { course: '4A', schoolYear: 2026, history: [] } : [] });
  });
  await page.goto('/tesoreria/fondos-por-actividad?loaderDelay=0', { waitUntil: 'commit' });
  const check = page.getByRole('checkbox', { name: 'Pagó Ana' });
  await expect(check).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.home-entry-transition')).toHaveCount(0);
  await check.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Adjuntar comprobante (opcional)').setInputFiles({ name: 'pago.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 prueba') });
  const bounds = await dialog.locator('form').boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(320);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('payment-receipt.png') });
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(check).toBeChecked();
  await page.locator('.collections-history summary').click();
  await expect(page.getByRole('button', { name: 'Descargar comprobante' })).toBeVisible();
});
