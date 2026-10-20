import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'demo-output/payments-review';
await mkdir(output, { recursive: true });
const bank = { id: 1, schoolYear: 2026, accountHolderName: 'Persona de prueba', accountHolderRut: '12345678-5', bankName: 'Banco de prueba', accountType: 'Cuenta Vista', accountNumber: '1234567890', email: 'transferencias@example.test' };
const payments = { schoolYear: 2026, annualAmount: 70000, totalAmount: 70000, allowedMode: 'AMBAS', selectedMode: 'PERSONALIZADA', studentName: 'Sofía Alejandra González Fernández', paidAmount: 20000, bankAccount: bank,
  installments: [
    { id: 1, concept: 'Cuota de marzo', amount: 20000, dueDate: '2026-03-30', status: 'PAGADA', history: [{ id: 1, amount: 20000, status: 'PAID', paymentMethod: 'TRANSFER', paidAt: '2026-03-20T12:00:00', originalFileName: 'prueba.pdf' }] },
    { id: 2, concept: 'Cuota personalizada de actividades del curso', amount: 25000, dueDate: '2026-10-30', status: 'PENDIENTE', history: [] },
    { id: 3, concept: 'Cuota de noviembre', amount: 25000, dueDate: '2026-11-30', status: 'EN_REVISION', history: [{ id: 3, amount: 25000, status: 'PROOF_SUBMITTED', paymentMethod: 'TRANSFER', submittedAt: '2026-10-19T12:00:00', originalFileName: 'prueba.pdf' }] },
  ] };
const reviews = payments.installments.map((item, index) => ({ id: item.id, studentName: payments.studentName, guardianName: 'Apoderado de prueba', installment: item.concept, amount: item.amount, status: index === 0 ? 'PAID' : 'PROOF_SUBMITTED', paymentMethod: 'TRANSFER', submittedAt: '2026-10-19T12:00:00', rejectionReason: null }));
const browser = await chromium.launch({ headless: true });
let views = 0;
try {
  for (const width of [320, 390, 768, 1216]) for (const theme of ['dark', 'light']) for (const role of ['USER', 'ADMIN']) {
    const context = await browser.newContext({ viewport: { width, height: width === 1216 ? 552 : 844 }, reducedMotion: 'reduce' });
    try {
      const user = { id: 77, nombre: 'Usuario de prueba', correo: 'pagos@example.test', rol: role, enabled: true };
      const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
      await context.addInitScript(theme => localStorage.setItem('app-theme', theme), theme);
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (!url.pathname.includes('/api/')) return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
        if (route.request().method() !== 'GET' && !url.pathname.endsWith('/auth/refresh')) throw new Error('Unexpected write during visual review');
        let body = [];
        if (url.pathname.endsWith('/auth/refresh')) body = { token, user, csrfToken: 'test' };
        else if (url.pathname.endsWith('/auth/me')) body = user;
        else if (url.pathname.endsWith('/cuenta-bancaria')) body = bank;
        else if (url.pathname.endsWith('/mis-pagos')) body = payments;
        else if (url.pathname.endsWith('/revision')) body = reviews;
        else if (url.pathname.endsWith('/disponibilidad')) body = { enabled: true };
        await route.fulfill({ json: body });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:5178/tesoreria/pagos?year=2026');
      const cards = page.locator(role === 'ADMIN' ? '.review-list article' : '.installment-row');
      await expect(cards).toHaveCount(3);
      await page.locator('#app-boot-loader').waitFor({ state: 'hidden' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if ([320, 390, 1216].includes(width)) await page.screenshot({ path: `${output}/${role}-${theme}-${width}.png`, fullPage: true });
      const trigger = page.locator(role === 'ADMIN' ? '.payment-preview__edit' : '.payment-bank-shortcut');
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
      if (role === 'ADMIN') expect((await dialog.boundingBox()).width).toBeLessThanOrEqual(320);
      expect(await dialog.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(await dialog.evaluate(el => el.clientWidth));
      if ([320, 390, 1216].includes(width)) await dialog.screenshot({ path: `${output}/${role}-${theme}-modal-${width}.png` });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      expect(errors).toEqual([]);
      views++;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ views, failures: [] }));
