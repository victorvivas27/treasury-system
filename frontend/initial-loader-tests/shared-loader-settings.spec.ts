import { test, expect, type BrowserContext } from '@playwright/test';
import path from 'node:path';

test('admin selection reaches a different user and browser, including the Home after login', async ({ page, context, browser }) => {
  const configuration = {
    startup: { variant: 'video', durationMs: 10000, exitMs: 1400, soundEnabled: false },
    pageTransition: { variant: 'cinematic', durationMs: 0, exitMs: 800, soundEnabled: false },
  };
  const mockServer = async (client: BrowserContext, role: string) => {
    const user = { id: role === 'ADMIN' ? 1 : 2, nombre: 'Usuario de prueba', correo: `${role}@example.test`, rol: role, profileImageType: 'INITIALS' };
    await client.route('https://storage.googleapis.com/**/app/v1/*', route => route.fulfill({ path: path.resolve('public/app-images/v1', new URL(route.request().url()).pathname.split('/').pop()!) }));
    await client.route('**/api/v1/**', async route => {
      const endpoint = new URL(route.request().url()).pathname;
      if (endpoint.endsWith('/loaders')) return route.fulfill({ json: configuration });
      if (endpoint.includes('/loaders/') && route.request().method() === 'PUT') {
        const key = endpoint.endsWith('/inicio') ? 'startup' : 'pageTransition';
        configuration[key] = route.request().postDataJSON();
        return route.fulfill({ json: configuration[key] });
      }
      return route.fulfill({ json: endpoint.endsWith('/auth/refresh') ? { token: `test-${role}`, user }
        : endpoint.endsWith('/auth/me') ? user : endpoint.endsWith('/configuracion-general/curso') ? { course: '4A', schoolYear: 2026, history: [] } : [] });
    });
  };
  await mockServer(context, 'ADMIN');
  await page.goto('/configuration?loader=nneo-rising-fill&loaderDelay=0&loaderExit=400');
  await expect(page.locator('#app-boot-loader')).toHaveCount(0);
  const startup = page.getByRole('article', { name: 'Inicio de la app' });
  await expect(startup.getByRole('radio', { name: /Rising Fill/ })).toBeEnabled();
  await startup.getByRole('radio', { name: /Rising Fill/ }).check();
  await startup.getByRole('button', { name: 'Guardar preferencia' }).click();
  await expect(startup.getByRole('status')).toContainText('guardada');
  const transitions = page.getByRole('article', { name: /Transiciones entre/ });
  await transitions.getByRole('radio', { name: /Rising Fill/ }).check();
  await transitions.getByRole('checkbox', { name: 'Sonido suave al abrir' }).check();
  await transitions.getByRole('button', { name: 'Guardar transiciones' }).click();
  await expect(transitions.getByRole('status')).toContainText('guardada');
  const memberContext = await browser.newContext({ viewport: page.viewportSize()!, reducedMotion: 'no-preference' });
  try {
    await mockServer(memberContext, 'USER');
    const member = await memberContext.newPage();
    await member.goto(new URL('/', page.url()).href);
    await expect(member.locator('#app-boot-loader')).toHaveAttribute('data-variant', 'nneo-rising-fill');
    await expect(member.locator('.page-entry-visual')).toHaveCount(0);
    await expect.poll(() => member.evaluate(() => JSON.parse(localStorage.getItem('app-page-transition') || '{}'))).toMatchObject({ variant: 'nneo-rising-fill', soundEnabled: true });
    await expect(member.locator('#app-boot-loader')).toHaveCount(0, { timeout: 15000 });
    await expect(member.locator('.public-home--member')).toBeVisible();
    await expect(member.locator('.public-home--member')).not.toHaveAttribute('inert');
    await expect(member.locator('.home-entry-transition')).toHaveCount(0);
    await expect(member.locator('.page-entry-visual')).toHaveCount(0);
  } finally { await memberContext.close(); }
});
