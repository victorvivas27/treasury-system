import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Entire API is synthetic. No real course, account, or financial data is touched.
const output = 'demo-output/dashboard-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [], failures = [];
const overview = {
  quotas: { totalFamilies: 32, annualFamilies: 20, twoInstallmentFamilies: 12, pendingObligations: 15, paidObligations: 29, collectedAmount: 1450000, pendingAmount: 750000 },
  finances: { schoolYear: 2026, feeIncome: 1450000, otherIncome: 500000, totalIncome: 1950000, totalExpenses: 310000, availableBalance: 1640000 },
  courseComposition: { masculino: 16, femenino: 18, otros: 1 },
  monthlyCashFlow: [], obligationStatus: [{ status: 'PAGADA', count: 29 }, { status: 'PENDIENTE', count: 15 }],
  expensesByCategory: [{ category: 'FOOD', amount: 310000 }],
  expensesByDescription: [{ id: 1, description: 'Colaciones y materiales para la convivencia de fin de semestre', category: 'FOOD', amount: 310000 }],
  recentMovements: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, type: i % 2 ? 'EGRESO' : 'INGRESO', description: i % 2 ? 'Materiales para las actividades y celebraciones del curso' : 'Recaudación de la rifa escolar del segundo semestre', amount: 100000 + i * 10000, date: `2026-0${i + 1}-15`, status: 'ACTIVE' })),
  auditTrail: [{ id: 1, action: 'CREATE', entityType: 'INGRESO', details: 'Registro de ingresos de actividades del curso', performedBy: 'administracion@example.test', createdAt: '2026-07-20T12:00:00' }],
};
// Include a full year so desktop cannot pass by fitting only a few months.
overview.recentMovements = Array.from({ length: 12 }, (_, index) => ({
  ...overview.recentMovements[index % overview.recentMovements.length],
  id: index + 1,
  date: `2026-${String(index + 1).padStart(2, '0')}-15`,
}));
try {
  await Promise.all([320, 375, 390, 430, 768, 1024, 1216].map(async width => {
    for (const theme of ['dark', 'light']) {
      for (const role of ['ADMIN', 'USER']) {
        const context = await browser.newContext({ viewport: { width, height: width === 1216 ? 552 : 844 }, reducedMotion: 'reduce' });
        try {
          const user = { id: 77, nombre: 'María de los Ángeles González Fernández', correo: 'dashboard@example.test', rol: role, enabled: true, profileImageType: 'INITIALS' };
          const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
          let state = 'loaded';
          await context.addInitScript(theme => localStorage.setItem('app-theme', theme), theme);
          await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (!url.pathname.includes('/api/')) return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
            let body = [];
            if (url.pathname.endsWith('/auth/refresh')) body = { token, user, csrfToken: 'test' };
            else if (url.pathname.endsWith('/auth/me')) body = user;
            else if (url.pathname.endsWith('/dashboard/overview')) {
              if (state === 'error') return route.fulfill({ status: 500, json: {} });
              body = state === 'empty' ? { ...overview, quotas: { totalFamilies: 0, annualFamilies: 0, twoInstallmentFamilies: 0, pendingObligations: 0, paidObligations: 0, collectedAmount: 0, pendingAmount: 0 }, recentMovements: [], auditTrail: [], expensesByDescription: [], courseComposition: { masculino: 0, femenino: 0, otros: 0 } } : overview;
            } else if (url.pathname.endsWith('/aportes/resumen')) body = { totalFamilies: state === 'empty' ? 0 : 32, cepaPaid: 20, cepaPending: 12, solidarityPaid: 16, solidarityPending: 16, fullyPaid: 16, withPending: 16 };
            else if (url.pathname.endsWith('/eventos/ganancias')) body = state === 'empty' ? [] : [{ id: 1, name: 'Fiesta de la Familia y encuentro de la comunidad escolar', eventDate: '2026-09-20', netProfit: 350000 }];
            else if (url.pathname.endsWith('/mensaje-directiva')) body = { heading: 'De parte de la directiva', title: 'Gracias por hacer equipo.', message: 'Su tiempo, ideas y cariño hacen posibles momentos inolvidables para nuestros niños y niñas.', signature: 'Con cariño,\nLa directiva del curso' };
            else if (url.pathname.endsWith('/cumpleanos')) body = [{ alumnoId: 1, codigo: 'AL-12345678', nombre: 'Sofía Alejandra González Fernández', activo: true, fechaNacimiento: '2018-12-15' }];
            return route.fulfill({ json: body });
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.goto('http://127.0.0.1:5178/dashboard');
          await page.getByRole('region', { name: 'Indicadores principales' }).waitFor();
          await page.locator('#app-boot-loader').waitFor({ state: 'hidden' });
          const skip = page.getByRole('button', { name: 'Omitir', exact: true });
          await skip.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
          if (await skip.isVisible()) await skip.click();
          if (width <= 680) {
            for (const title of ['Dinero del curso', 'Cuotas del curso', 'Nuestro curso']) {
              await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
            }
            const financialGroup = page.getByRole('region', { name: 'Dinero del curso', exact: true });
            await expect(financialGroup.getByRole('link', { name: 'Ingresos totales', exact: true })).toBeVisible();
            await expect(page.getByRole('region', { name: 'Cuotas del curso', exact: true })).toContainText('Cuotas pagadas');
            await expect(page.getByRole('region', { name: 'Nuestro curso', exact: true })).toContainText('Familias activas');
          }
          const inspect = async phase => {
            await page.mouse.move(0, 0);
            const geometry = await page.locator('.business-dashboard').evaluate(el => {
              const overflow = [...el.querySelectorAll('*')].filter(node => {
                if (node.closest('svg, .flow-ribbon-scroll, .dashboard-table-wrap, .dashboard-collapse-content[aria-hidden="true"], .dashboard-board-message__accessible')) return false;
                const r = node.getBoundingClientRect();
                return r.width && (r.right > innerWidth + 1 || r.left < -1);
              }).map(node => node.className || node.tagName).slice(0, 12);
              const balance = el.querySelector('.dashboard-kpi--featured')?.getBoundingClientRect();
              return { overflow, scrollWidth: document.documentElement.scrollWidth, balanceRight: balance?.right, panelColumns: getComputedStyle(el.querySelector('.dashboard-charts') ?? el).gridTemplateColumns };
            });
            expect(geometry.overflow).toEqual([]);
            expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
            if (width >= 1024) {
              const timeline = await page.locator('.flow-ribbon-scroll').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth }));
              expect(timeline.content).toBeLessThanOrEqual(timeline.width + 1);
            }
            expect(errors).toEqual([]);
            results.push({ width, theme, role, phase, ...geometry });
            if ([320, 390, 1216].includes(width)) await page.screenshot({ path: `${output}/${role}-${theme}-${phase}-${width}.png`, fullPage: true });
          };
          await inspect('collapsed');
          if ([320, 390, 1216].includes(width)) await page.locator('.dashboard-kpis').screenshot({ path: `${output}/${role}-${theme}-summary-${width}.png` });
          for (const button of await page.locator('.dashboard-collapse-trigger').all()) await button.click();
          await expect(page.locator('#dashboard-course-contributions')).toHaveClass(/is-open/);
          const metricAppearance = await page.locator('.contribution-donut__metric').first().evaluate(el => {
            const style = getComputedStyle(el);
            return { border: style.borderTopWidth, background: style.backgroundColor };
          });
          expect(metricAppearance).toEqual({ border: '0px', background: 'rgba(0, 0, 0, 0)' });
          if (role === 'USER') await expect(page.getByRole('button', { name: /Trazas de Tesorería/ })).toHaveCount(0);
          await inspect('expanded');
          await page.getByRole('button', { name: 'Año escolar', exact: true }).click();
          await page.getByRole('option', { name: '2027', exact: true }).click();
          await expect(page.getByRole('button', { name: 'Año escolar', exact: true })).toHaveText('2027');
          if (width === 390 && theme === 'dark') {
            state = 'empty';
            await page.getByRole('button', { name: 'Año escolar', exact: true }).click();
            await page.getByRole('option', { name: '2028', exact: true }).click();
            await page.getByText('No hay familias para calcular los aportes.').waitFor();
            await inspect('empty');
            state = 'error';
            await page.getByRole('button', { name: 'Año escolar', exact: true }).click();
            await page.getByRole('option', { name: '2029', exact: true }).click();
            await page.getByText('No fue posible cargar el dashboard.').waitFor();
            expect(errors).toEqual([]);
            results.push({ width, theme, role, phase: 'error', errors });
          }
        } catch (error) { failures.push({ width, theme, role, message: error.message }); }
        finally { await context.close(); }
      }
    }
  }));
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ results, failures }, null, 2));
}
console.log(JSON.stringify({ views: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
