import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Synthetic responses only: this audit never contacts or writes to a real API.
const phase = process.argv[2] ?? 'after';
const components = phase === 'components';
const homeOnly = phase === 'home';
const theme = process.env.DESIGN_THEME ?? 'dark';
const baseURL = process.env.DESIGN_BASE_URL ?? 'http://127.0.0.1:5178';
const output = `demo-output/design-system/${phase}${theme === 'light' ? '-light' : ''}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const user = { id: 77, nombre: 'María de los Ángeles González', correo: 'design@example.test', rol: 'ADMIN', enabled: true, accountNonLocked: true, emailVerifiedAt: '2026-01-01', profileImageType: 'INITIALS' };
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
const routes = ['/', '/login', '/olvide-password', '/aceptar-invitacion', '/password-actualizada', '/students', '/parents', '/family', '/students/new', '/parents/new', '/family/new', '/users', '/profile', '/configuration', '/calendario/horario-clases', '/admin/horario-clases', '/admin/sobre-nosotros', '/admin/fotos-del-curso', '/admin/directiva', '/admin/mejoras', '/tesoreria/pagos', '/tesoreria/ingresos', '/tesoreria/gastos', '/tesoreria/cuotas', '/tesoreria/aportes', '/tesoreria/eventos', '/tesoreria/reportes', '/tesoreria/stands', '/notifications', '/birthdays', '/no-existe'];
const results = [];
await Promise.all((phase === 'before' ? [320, 390, 1216] : [320, 375, 390, 430, 768, 1024, 1216]).map(async width => {
  const context = await browser.newContext({ viewport: { width, height: width === 1216 ? 552 : 844 }, reducedMotion: 'reduce' });
  await context.route('**/tesoreria/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = [];
    if (path.endsWith('/auth/refresh') && ['/', '/login', '/olvide-password', '/aceptar-invitacion', '/password-actualizada'].includes(new URL(route.request().frame().url()).pathname)) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      return;
    }
    if (path.endsWith('/auth/refresh')) body = { token, user, csrfToken: 'test' };
    else if (path.endsWith('/auth/me')) body = user;
    else if (path.endsWith('/academic/schedules/periods')) body = [{ schoolYear: 2026, course: 'Curso de prueba', editable: true }];
    else if (/\/academic\/schedules\/2026(?:\/draft)?$/.test(path)) body = { days: [] };
    else if (/\/(alumnos|apoderados|familias|usuarios|users)$/.test(path)) body = { content: components && path.endsWith('/alumnos') ? [{ alumnoId: 1, codigo: 'AL-12345678', nombre: 'María de los Ángeles González Fernández', curso: '1A', genero: 'FEMENINO', activo: true, fechaNacimiento: '2018-05-04', observacion: 'Observación de prueba' }] : [], totalElements: components ? 1 : 0, totalPages: 1, page: 0, number: 0, size: 10, first: true, last: true, empty: !components };
    else if (path.endsWith('/configuracion-general/curso')) body = { course: '1A', schoolYear: 2026, history: [] };
    else if (path.endsWith('/dashboard/overview')) body = { quotas: { totalFamilies: 0, annualFamilies: 0, twoInstallmentFamilies: 0, pendingObligations: 0, paidObligations: 0, collectedAmount: 0, pendingAmount: 0 }, finances: { schoolYear: 2026, feeIncome: 0, otherIncome: 0, totalIncome: 0, totalExpenses: 0, availableBalance: 0 }, courseComposition: { masculino: 0, femenino: 0, otros: 0 }, monthlyCashFlow: [], obligationStatus: [], expensesByCategory: [], expensesByDescription: [], recentMovements: [], auditTrail: [] };
    else if (path.endsWith('/cuotas/page')) body = { families: [], plans: [], obligations: [], dashboard: null };
    else if (path.endsWith('/admin/improvements')) body = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };
    else if (path.endsWith('/admin/improvements/summary')) body = { total: 0, received: 0, underReview: 0, planned: 0, implemented: 0, critical: 0 };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  let errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(selectedTheme => {
    localStorage.setItem('treasury.app-tour.dismissed', 'true');
    localStorage.setItem('app-theme', selectedTheme);
  }, theme);
  for (const path of (homeOnly ? ['/'] : components ? ['/students', '/profile'] : phase === 'before' ? ['/', '/login', '/students', '/calendario/horario-clases', '/tesoreria/aportes'] : routes)) {
    errors = [];
    await page.goto(`${baseURL}${path}`);
    try {
      await page.locator('#app-boot-loader').waitFor({ state: 'hidden', timeout: 8000 });
    } catch {
      results.push({ path, width, errors: [...errors], blocked: 'boot loader' });
      console.log(JSON.stringify({ path, width, errors }));
      continue;
    }
    await page.waitForTimeout(250);
    const skip = page.getByRole('button', { name: 'Omitir', exact: true });
    if (await page.locator('.main-layout').count()) {
      await skip.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
    }
    if (await skip.isVisible()) await skip.click();
    const result = await page.evaluate(() => {
      const headings = [...document.querySelectorAll('h1')].map(el => ({ text: el.textContent, size: getComputedStyle(el).fontSize }));
      const overflow = [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('[aria-hidden="true"]') && !el.closest('.sidebar');
      }).slice(0, 8).map(el => el.className || el.tagName);
      return { headings, scrollWidth: document.documentElement.scrollWidth, overflow };
    });
    results.push({ path, width, actualPath: new URL(page.url()).pathname, errors: [...errors], ...result });
    if (homeOnly) {
      const typography = await page.evaluate(async () => {
        const title = document.querySelector('h1');
        if (!title) throw new Error('Falta el H1 del Home público');
        document.documentElement.style.setProperty('--font-h1', '23px');
        await new Promise(resolve => setTimeout(resolve, 700));
        const tokenSize = getComputedStyle(title).fontSize;
        const style = document.createElement('style');
        style.textContent = 'h1 { font-size: 31px; line-height: 1.7; letter-spacing: 2px; }';
        document.head.append(style);
        await new Promise(resolve => setTimeout(resolve, 700));
        const computed = getComputedStyle(title);
        const values = { tokenSize, size: computed.fontSize, leading: computed.lineHeight, tracking: computed.letterSpacing };
        style.remove();
        document.documentElement.style.removeProperty('--font-h1');
        return values;
      });
      if (typography.tokenSize !== '23px' || typography.size !== '31px' || Math.abs(parseFloat(typography.leading) - 52.7) > .01 || typography.tracking !== '2px') {
        throw new Error(`El H1 del Home sobrescribe la tipografía global a ${width}px: ${JSON.stringify(typography)}`);
      }
    }
    if (components) {
      if (path === '/students') await page.getByTestId('delete-btn-AL-12345678').click();
      else await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
      const dialog = page.locator(path === '/students' ? '.modal-confirm-container' : '.profile-edit-modal');
      await dialog.waitFor({ state: 'visible' });
      await page.waitForTimeout(350);
      const geometry = await dialog.evaluate(el => ({ width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right, left: el.getBoundingClientRect().left, locked: getComputedStyle(document.body).overflow === 'hidden' }));
      if (geometry.width > (path === '/students' ? 280 : 320) + 1 || geometry.right > width || geometry.left < 0 || !geometry.locked) throw new Error(`Invalid modal ${path} at ${width}: ${JSON.stringify(geometry)}`);
      results.push({ path: `${path}#modal`, viewportWidth: width, ...geometry });
      await page.screenshot({ path: `${output}/${path.replaceAll('/', '_')}-modal-${width}.png`, fullPage: true });
      if (path === '/students') await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      else await page.getByRole('button', { name: 'Cerrar edición', exact: true }).click();
    }
    if ([320, 390, 1216].includes(width) && ['/', '/login', '/students', '/calendario/horario-clases', '/tesoreria/aportes'].includes(path)) {
      await page.screenshot({ path: `${output}/${path.replaceAll('/', '_') || 'home'}-${width}.png`, fullPage: true });
    }
    if (phase !== 'before' && width === 390 && !['/', '/no-existe'].includes(path)) {
      const sizes = await page.evaluate(() => {
        document.documentElement.style.setProperty('--font-h1', '31px');
        return [...document.querySelectorAll('h1')].map(el => getComputedStyle(el).fontSize);
      });
      if (sizes.some(size => size !== '31px')) throw new Error(`H1 token not propagated: ${path}: ${sizes}`);
    }
  }
  await context.close();
}));
await browser.close();
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
const failures = results.filter(r => r.errors?.length || r.blocked || r.scrollWidth > r.width || r.overflow?.length);
console.log(JSON.stringify({ phase, views: results.length, failures, redirects: results.filter(r => r.actualPath && r.actualPath !== r.path) }, null, 2));
if (failures.length) process.exitCode = 1;
