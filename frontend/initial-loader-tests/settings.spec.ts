import { test, expect } from '@playwright/test';

test('admin configures startup and previews the draft on the same settings page', async ({ page }) => {
  const user = { id: 1, nombre: 'Administración', correo: 'admin@example.test', rol: 'ADMIN', profileImageType: 'INITIALS' };
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/auth/refresh') ? { token: 'preview-test', user }
      : path.endsWith('/auth/me') ? user
      : path.endsWith('/configuracion-general/curso') ? { course: '1A', schoolYear: 2026, history: [] }
      : [];
    return route.fulfill({ json: body });
  });
  await page.goto('/configuration?loaderDelay=0');
  await expect(page.locator('#app-boot-loader')).toHaveCount(0);
  const settings = page.locator('.startup-settings');
  await expect(settings.getByRole('heading', { name: 'Inicio de la app' })).toBeVisible();
  await settings.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await settings.getByLabel('Tiempo de prueba').selectOption('3000');
  await settings.getByRole('slider').fill('2000');
  await settings.getByRole('button', { name: 'Guardar preferencia' }).click();
  await expect(settings.getByRole('status')).toContainText('guardada');
  await expect(page).toHaveURL(/\/configuration$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('app-startup-preview')!)))
    .toEqual({ variant: 'video', durationMs: 3000, exitMs: 2000 });
  await settings.screenshot({ path: test.info().outputPath('admin-startup-settings.png') });
  await settings.getByRole('radio', { name: /Cinemática/ }).check();
  await expect(settings.getByRole('slider')).toBeDisabled();
  await settings.getByRole('button', { name: 'Probar inicio' }).click();
  await expect(page).toHaveURL(/loader=cinematic/);
  await expect(page.locator('#app-boot-loader')).toHaveAttribute('data-variant', 'cinematic');
  await expect(page.locator('#app-boot-loader')).toHaveCount(0);
  await expect(page.locator('.startup-settings').getByRole('radio', { name: /Cinemática/ })).toBeChecked();
});
