import { test, expect } from '@playwright/test';
import path from 'node:path';

test('Rising Fill synchronizes glyph fill and arrow, shows the final title and opens both panels', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/src/main.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto('/?loader=nneo-rising-fill&loaderDelay=0&loaderExit=600');
  const loader = page.locator('#app-boot-loader');
  await expect(loader).toHaveAttribute('data-variant', 'nneo-rising-fill');
  await page.evaluate(() => dispatchEvent(new CustomEvent('app:boot-progress', { detail: { progress: 65 } })));
  await expect(loader).toHaveAttribute('data-progress', '65');
  await expect(loader.locator('.nneo-rising-outline')).toHaveText('065');
  await expect(loader.locator('.is-current')).toHaveText('INGRESANDO A TESORERÍA');
  const geometry = await loader.evaluate(node => {
    const fill = node.querySelector('rect')!;
    return { y: fill.getAttribute('y'), arrow: node.querySelector('.nneo-rising-indicator')!.getAttribute('transform'),
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(geometry.arrow).toBe(`translate(0 ${geometry.y})`);
  expect(geometry.overflow).toBe(false);
  const counter = await loader.locator('.nneo-rising-counter').boundingBox();
  expect(counter!.x).toBeGreaterThanOrEqual(0);
  expect(counter!.x + counter!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(counter!.y).toBeGreaterThanOrEqual(0);
  expect(counter!.y + counter!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(loader.locator('.is-current')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: test.info().outputPath('rising-fill-065.png') });
  await page.evaluate(() => dispatchEvent(new CustomEvent('app:boot-progress', { detail: { progress: 100 } })));
  await expect(loader).toHaveAttribute('data-progress', '99');
  await expect(loader).toHaveAttribute('data-rising-stage', 'loading');
  await page.evaluate(() => dispatchEvent(new Event('app:boot-ready')));
  await expect(loader).toHaveAttribute('data-progress', '100');
  await expect(loader).toHaveAttribute('data-rising-stage', 'ready');
  await page.waitForFunction(() => {
    const title = document.querySelector('.nneo-rising-finale');
    return title && Number(getComputedStyle(title).opacity) >= .99;
  }, undefined, { polling: 'raf' });
  await page.screenshot({ path: test.info().outputPath('rising-fill-finale.png') });
  await expect(loader).toHaveAttribute('data-rising-stage', 'opening');
  const directions = await loader.evaluate(node => [...node.querySelectorAll('.nneo-rising-panel')].map(panel =>
    getComputedStyle(panel).transitionProperty));
  expect(directions).toEqual(['transform', 'transform']);
  await expect(loader).toHaveCount(0);
  await expect(page.locator('#root')).not.toHaveAttribute('inert');
});

test('real page readiness gates startup, without chaining another loader', async ({ page }) => {
  let release!: () => void;
  const data = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  const user = { id: 1, nombre: 'Admin', correo: 'admin@example.test', rol: 'ADMIN', profileImageType: 'INITIALS' };
  await page.route('https://storage.googleapis.com/**/app/v1/*', route => route.fulfill({
    path: path.resolve('public/app-images/v1', new URL(route.request().url()).pathname.split('/').pop()!),
  }));
  await page.route('**/api/v1/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint.endsWith('/alumnos')) {
      requested = true; await data;
      return route.fulfill({ json: { content: [{ alumnoId: 1, codigo: 'AL-12345678', nombre: 'Alumno de prueba', curso: '4A', activo: true }], page: 0, size: 3, totalElements: 1, totalPages: 1 } });
    }
    return route.fulfill({ json: endpoint.endsWith('/auth/refresh') ? { token: 'preview-test', user }
      : endpoint.endsWith('/auth/me') ? user : endpoint.endsWith('/configuracion-general/curso') ? { course: '4A', schoolYear: 2026, history: [] } : [] });
  });
  await page.goto('/students?loader=nneo-rising-fill&loaderDelay=0&loaderExit=400');
  await expect.poll(() => requested).toBe(true);
  const loader = page.locator('#app-boot-loader');
  await expect(loader).toHaveAttribute('data-rising-stage', 'loading');
  await expect(page.locator('.page-entry-visual')).toHaveCount(0);
  expect(Number(await loader.getAttribute('data-progress'))).toBeLessThan(100);
  release();
  await expect(loader).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByText('Alumno de prueba', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.page-entry-visual')).toHaveCount(0);
  await expect(page.locator('#root')).not.toHaveAttribute('inert');
});

test('reduced motion finishes without animation and boot failures offer recovery', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/src/main.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto('/?loader=nneo-rising-fill&loaderDelay=0');
  await expect(page.locator('#app-boot-loader')).toHaveAttribute('data-progress', '0');
  await page.evaluate(() => dispatchEvent(new Event('app:boot-ready')));
  await expect(page.locator('#app-boot-loader')).toHaveCount(0);
  await page.goto('/?loader=nneo-rising-fill&loaderDelay=0');
  await page.evaluate(() => dispatchEvent(new ErrorEvent('error', { message: 'Boot failure' })));
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(page.locator('.nneo-rising-counter')).toHaveCount(0);
});

test('mobile landscape keeps the counter, arrow and final title inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/src/main.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto('/?loader=nneo-rising-fill&loaderDelay=0&loaderExit=600');
  const loader = page.locator('#app-boot-loader');
  await page.evaluate(() => dispatchEvent(new CustomEvent('app:boot-progress', { detail: { progress: 65 } })));
  const counter = await loader.locator('.nneo-rising-counter').boundingBox();
  expect(counter!.y).toBeGreaterThanOrEqual(0);
  expect(counter!.y + counter!.height).toBeLessThanOrEqual(390);
  await page.screenshot({ path: test.info().outputPath('rising-fill-landscape.png') });
  await page.evaluate(() => dispatchEvent(new Event('app:boot-ready')));
  await expect(loader).toHaveAttribute('data-rising-stage', 'ready');
  const title = await loader.locator('.nneo-rising-finale strong').boundingBox();
  expect(title!.x).toBeGreaterThanOrEqual(0);
  expect(title!.x + title!.width).toBeLessThanOrEqual(844);
  await expect(loader).toHaveCount(0);
});
