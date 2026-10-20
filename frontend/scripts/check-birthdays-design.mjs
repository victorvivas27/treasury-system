import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'demo-output/birthdays-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const user = { id: 77, nombre: 'Usuario de prueba', correo: 'birthdays@example.test', rol: 'ADMIN', enabled: true };
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
const students = Array.from({ length: 18 }, (_, index) => ({
  alumnoId: index + 1, codigo: `AL-${index + 1}`, activo: true, curso: '1A', genero: 'OTROS',
  nombre: index % 2 ? 'Sofía Alejandra González Fernández' : `Alumno de prueba ${index + 1}`,
  fechaNacimiento: `2019-${String(index % 12 + 1).padStart(2, '0')}-20`,
}));
let views = 0;
try {
  for (const width of [320, 375, 390, 430, 768, 1216]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: width === 1216 ? 552 : 844 }, reducedMotion: 'reduce' });
      try {
        await context.addInitScript(theme => localStorage.setItem('app-theme', theme), theme);
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (!url.pathname.includes('/api/')) return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
          let body = [];
          if (url.pathname.endsWith('/auth/refresh')) body = { token, user, csrfToken: 'test' };
          else if (url.pathname.endsWith('/auth/me')) body = user;
          else if (url.pathname.endsWith('/cumpleanos')) body = students;
          await route.fulfill({ json: body });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:5178/birthdays');
        await expect(page.locator('.birthday-card:not(.birthday-card--loading)')).toHaveCount(18);
        await page.locator('#app-boot-loader').waitFor({ state: 'hidden' });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        const clippedNames = await page.locator('.birthday-card__body h3').evaluateAll(elements => elements.filter(el => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).length);
        expect(clippedNames).toBe(0);
        if (width === 1216) {
          await page.locator('.sidebar-state-toggle').click();
          await expect(page.locator('#app-sidebar')).toHaveAttribute('data-state', 'icons');
          const menuButton = page.locator('[aria-controls="treasury-submenu"]');
          await menuButton.click();
          const submenu = page.locator('#treasury-submenu');
          await expect(submenu).toBeVisible();
          const destination = await submenu.getByRole('link').first().boundingBox();
          await page.mouse.move(destination.x + destination.width / 2, destination.y + destination.height / 2, { steps: 30 });
          await expect(submenu).toBeVisible();
          await expect(page.locator('#app-sidebar')).toHaveAttribute('data-state', 'icons');
          await page.mouse.move(width - 10, 500, { steps: 15 });
          await expect(page.locator('#app-sidebar')).toHaveAttribute('data-state', 'hidden');
        }
        if (width <= 640) {
          const trigger = page.locator('.birthday-card__more').first();
          await trigger.click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('Sofía Alejandra González Fernández');
          expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
          const modal = await page.getByRole('dialog').boundingBox();
          expect(modal.width).toBeLessThanOrEqual(320);
          await page.getByRole('dialog').screenshot({ path: `${output}/${theme}-modal-${width}.png` });
          await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await expect(trigger).toBeFocused();
          await trigger.click();
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).toHaveCount(0);
          expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        }
        expect(errors).toEqual([]);
        if ([320, 390, 1216].includes(width)) await page.screenshot({ path: `${output}/${theme}-${width}.png`, fullPage: true });
        views++;
      } finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ views, failures: [] }));
