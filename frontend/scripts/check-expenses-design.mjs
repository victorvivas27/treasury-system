import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'demo-output/expenses-review';
await mkdir(output, { recursive: true });
const expenses = Array.from({ length: 8 }, (_, index) => ({ id: index + 1, schoolYear: 2026, description: index % 2 ? 'Recaudación de la rifa del segundo semestre y actividades del curso' : 'Aporte de convivencia', amount: 15000 + index * 10000, expenseDate: '2026-10-19', category: 'MATERIALS', status: 'ACTIVE', source: 'Rifa escolar', registeredBy: 'Tesorería del curso', createdAt: '2026-10-19T12:00:00', course: '1A', notes: 'Registro de prueba' }));
const overview = { finances: { schoolYear: 2026, feeIncome: 140000, otherIncome: 240000, totalIncome: 380000, totalExpenses: 60000, availableBalance: 320000 }, recentMovements: [{ id: 20, type: 'CUOTA', amount: 35000, date: '2026-10-18', description: 'Cuota de Sofía Alejandra González Fernández' }] };
const browser = await chromium.launch({ headless: true });
let views = 0;
try {
  for (const width of [320, 390, 1216]) for (const theme of ['dark', 'light']) for (const role of ['ADMIN', 'USER']) {
    const context = await browser.newContext({ viewport: { width, height: width === 1216 ? 552 : 844 }, reducedMotion: 'reduce' });
    try {
      const user = { id: 77, nombre: 'Usuario de prueba', correo: 'egresos@example.test', rol: role, enabled: true };
      const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
      await context.addInitScript(theme => localStorage.setItem('app-theme', theme), theme);
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (!url.pathname.includes('/api/')) return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
        if (route.request().method() !== 'GET' && !url.pathname.endsWith('/auth/refresh')) throw new Error('Unexpected financial write');
        let body = [];
        if (url.pathname.endsWith('/auth/refresh')) body = { token, user, csrfToken: 'test' };
        else if (url.pathname.endsWith('/auth/me')) body = user;
        else if (url.pathname.endsWith('/egresos')) body = expenses;
        else if (url.pathname.endsWith('/resumen-financiero')) body = overview.finances;
        else if (url.pathname.endsWith('/configuracion-general/curso')) body = { course: '1A', schoolYear: 2026 };
        await route.fulfill({ json: body });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:5178/tesoreria/gastos?year=2026');
      await expect(page.locator('.expense-card:not(.expense-card--skeleton)')).toHaveCount(3);
      const results = page.getByRole('region', { name: 'Listado de egresos' });
      await expect(results).toBeVisible();
      await page.locator('#app-boot-loader').waitFor({ state: 'hidden' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `${output}/${role}-${theme}-${width}.png`, fullPage: true });
      const firstPageHeight = (await results.boundingBox()).height;
      await results.getByRole('button', { name: /Siguiente/ }).click();
      await results.getByRole('button', { name: /Siguiente/ }).click();
      await expect(results.getByRole('article')).toHaveCount(2);
      await expect(results.locator('.expense-card-placeholder')).toHaveCount(1);
      expect(Math.abs((await results.boundingBox()).height - firstPageHeight)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `${output}/${role}-${theme}-last-page-${width}.png`, fullPage: true });
      await results.getByRole('button', { name: /Anterior/ }).click();
      await page.getByRole('button', { name: 'Filtros', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: /^Ver detalle de/ }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      const detail = page.getByRole('dialog');
      expect((await detail.boundingBox()).width).toBeLessThanOrEqual(320);
      expect(await detail.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await detail.screenshot({ path: `${output}/${role}-${theme}-detail-${width}.png` });
      await page.keyboard.press('Escape');
      if (role === 'ADMIN') {
        await page.getByRole('button', { name: 'Registrar egreso', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        expect((await dialog.boundingBox()).width).toBeLessThanOrEqual(320);
        expect(await dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
        await dialog.screenshot({ path: `${output}/${role}-${theme}-form-${width}.png` });
        await page.keyboard.press('Escape');
      }
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      expect(errors).toEqual([]);
      views++;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ views, failures: [] }));
