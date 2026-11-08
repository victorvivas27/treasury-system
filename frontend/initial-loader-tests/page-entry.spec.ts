import { test, expect } from '@playwright/test';
import path from 'node:path';

test('first page visit waits for data; returning keeps cached rows visible during refresh', async ({ page }) => {
  test.setTimeout(90000);
  const user = { id: 1, nombre: 'Administración', correo: 'admin@example.test', rol: 'ADMIN', profileImageType: 'INITIALS' };
  let releaseFirst!: () => void;
  let releaseRefresh!: () => void;
  const first = new Promise<void>(resolve => { releaseFirst = resolve; });
  const refresh = new Promise<void>(resolve => { releaseRefresh = resolve; });
  let studentReads = 0;
  let refreshing = false;
  await page.route('https://storage.googleapis.com/**/app/v1/*', route => route.fulfill({
    path: path.resolve('public/app-images/v1', new URL(route.request().url()).pathname.split('/').pop()!),
  }));
  await page.route('**/api/v1/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint.endsWith('/alumnos')) {
      studentReads += 1;
      await (refreshing ? refresh : first);
      return route.fulfill({ json: { content: [{ alumnoId: 1, codigo: 'AL-12345678', nombre: 'Alumno de prueba',
        curso: '4A', genero: 'MASCULINO', activo: true }], page: 0, size: 3, totalElements: 1, totalPages: 1 } });
    }
    return route.fulfill({ json: endpoint.endsWith('/auth/refresh') ? { token: 'preview-test', user }
      : endpoint.endsWith('/auth/me') ? user
      : endpoint.endsWith('/configuracion-general/curso') ? { course: '4A', schoolYear: 2026, history: [] } : [] });
  });
  await page.goto('/students?loaderDelay=0', { waitUntil: 'commit' });
  await expect(page.locator('#app-boot-loader')).toHaveCount(0, { timeout: 45000 });
  const transition = page.locator('.home-entry-transition');
  await expect(transition).toBeVisible();
  await expect(page.locator('.page-transition-content')).toHaveAttribute('inert');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('page-entry.png') });
  releaseFirst();
  await expect(transition).toHaveCount(0);
  await expect(page.getByText('Alumno de prueba', { exact: true }).first()).toBeVisible();
  const initialReads = studentReads;
  refreshing = true;
  const navigate = (url: string) => page.evaluate(target => {
    history.pushState({}, '', target);
    dispatchEvent(new PopStateEvent('popstate'));
  }, url);
  await navigate('/birthdays');
  await expect(page).toHaveURL(/\/birthdays$/);
  await expect(transition).toHaveCount(0);
  await expect(page.locator('.birthdays-page')).toBeVisible();
  await navigate('/students');
  await expect(page.getByText('Alumno de prueba', { exact: true }).first()).toBeVisible();
  await expect(transition).toHaveCount(0);
  await expect(page.locator('.page-transition-content')).not.toHaveAttribute('inert');
  await expect.poll(() => studentReads).toBeGreaterThan(initialReads);
  releaseRefresh();
});
