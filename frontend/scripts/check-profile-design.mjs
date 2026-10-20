import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Synthetic API only. Run against local Vite; never use real accounts.
const personalized = process.argv.includes('--personalizada');
const output = `demo-output/profile-review${personalized ? '-personalizada' : ''}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];
const user = { id: 77, nombre: 'María de los Ángeles González Fernández', correo: 'maria.gonzalez.apoderada@example.test', rol: 'USER', enabled: true, profileImageType: 'INITIALS' };
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
const profile = {
  familyId: 8, familyCode: 'FAM-008', studentName: 'Sofía Alejandra González Fernández',
  guardianPhone: '+56 9 1234 5678', relationship: 'Madre', primaryGuardian: true,
  studentMessage: 'Retirar el viernes a las 13:00. Avisar a la administración ante cualquier cambio.',
  mode: personalized ? 'PERSONALIZADA' : 'DOS_CUOTAS', cepa: { status: 'PAID' }, solidarity: { status: 'PENDING' },
  obligations: [
    { id: 1, amount: 35000, dueDate: '2026-04-15', status: 'PAGADA', concept: 'Primera cuota del curso', mode: 'DOS_CUOTAS' },
    { id: 2, amount: 35000, dueDate: '2026-07-15', status: 'PENDIENTE', concept: 'Segunda cuota del curso', mode: 'DOS_CUOTAS' },
  ],
};
if (personalized) {
  profile.obligations[1].concept = 'Aporte personalizado para actividades del segundo semestre';
}
try {
  await Promise.all([320, 375, 390, 430, 768, 1024, 1216].map(async width => {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({ viewport: { width, height: width === 1216 ? 552 : 844 }, reducedMotion: 'reduce' });
      const errors = [];
      let savedPhone;
      try {
        await context.addInitScript(theme => {
          localStorage.setItem('app-theme', theme);
          localStorage.setItem('treasury.app-tour.dismissed', 'true');
        }, theme);
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (!url.pathname.includes('/api/')) {
            if (url.hostname !== '127.0.0.1') return route.abort();
            return route.continue();
          }
          let body = [];
          if (url.pathname.endsWith('/auth/refresh')) body = { token, user, csrfToken: 'test' };
          else if (url.pathname.endsWith('/auth/me')) body = user;
          else if (url.pathname.endsWith('/perfil')) body = profile;
          else if (url.pathname.endsWith('/users/77/profile')) {
            savedPhone = route.request().postDataJSON().telefono;
            body = user;
          }
          return route.fulfill({ json: body });
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:5178/profile');
        await page.getByText('Apoderado principal', { exact: true }).waitFor();
        await page.locator('#app-boot-loader').waitFor({ state: 'hidden' });
        const skip = page.getByRole('button', { name: 'Omitir', exact: true });
        await skip.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
        if (await skip.isVisible()) await skip.click();
        const geometry = await page.locator('.profile-card').evaluate(el => {
          const family = el.querySelector('.profile-family-data').getBoundingClientRect();
          const identity = el.querySelector('.profile-identity').getBoundingClientRect();
          const overflow = [...el.querySelectorAll('*')].filter(node => {
            if (node.closest('.profile-identity-glow') || node.tagName === 'svg' || node.closest('svg')) return false;
            const r = node.getBoundingClientRect();
            return r.width && (r.right > innerWidth + 1 || r.left < -1);
          }).map(node => node.className || node.tagName);
          return { scrollWidth: document.documentElement.scrollWidth, overflow,
            columns: getComputedStyle(el).gridTemplateColumns,
            sideBySide: family.left > identity.right, stacked: family.top >= identity.bottom };
        });
        expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
        expect(geometry.overflow).toEqual([]);
        expect(width >= 1024 ? geometry.sideBySide : geometry.stacked).toBe(true);
        if (width <= 680) expect(await page.getByRole('button', { name: 'Editar perfil' }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
        await page.screenshot({ path: `${output}/profile-${theme}-${width}.png`, fullPage: true });
        await page.getByRole('button', { name: 'Editar perfil' }).click();
        const dialog = page.getByRole('dialog', { name: 'Editar perfil' });
        await expect(dialog).toBeVisible();
        await dialog.locator('.profile-avatar-gallery img').first().waitFor();
        await expect.poll(() => dialog.locator('.profile-avatar-gallery img').first().evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
        const modal = await dialog.evaluate(el => {
          const r = el.getBoundingClientRect();
          return { width: r.width, left: r.left, right: r.right, top: r.top, bottom: r.bottom, locked: getComputedStyle(document.body).overflow === 'hidden', overflow: el.scrollWidth > el.clientWidth };
        });
        expect(modal.width).toBeLessThanOrEqual(320);
        expect(modal.left).toBeGreaterThanOrEqual(0);
        expect(modal.right).toBeLessThanOrEqual(width);
        expect(modal.top).toBeGreaterThanOrEqual(0);
        expect(modal.bottom).toBeLessThanOrEqual(width === 1216 ? 552 : 844);
        expect(modal.locked).toBe(true);
        expect(modal.overflow).toBe(false);
        await page.screenshot({ path: `${output}/editor-${theme}-${width}.png` });
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Editar perfil' })).toBeFocused();
        await page.getByRole('button', { name: 'Editar perfil' }).click();
        await page.getByLabel('Teléfono', { exact: true }).fill('+56 9 8765 4321');
        await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        expect(savedPhone).toBe('+56987654321');
        await expect(page.getByText('+56987654321', { exact: true })).toBeVisible();
        expect(errors).toEqual([]);
        results.push({ width, theme, geometry, modal, errors });
      } catch (error) {
        failures.push({ width, theme, message: error.message });
      } finally { await context.close(); }
    }
  }));
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ results, failures }, null, 2));
}
console.log(JSON.stringify({ views: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
