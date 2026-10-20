import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// All API responses are synthetic; no real accounts or services are used.
const output = 'demo-output/home-auth-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const user = { id: 77, nombre: 'María de los Ángeles González Fernández', correo: 'review@example.test', rol: 'ADMIN', enabled: true, profileImageType: 'INITIALS' };
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
try {
  for (const width of [320, 375, 390, 430, 768, 1024, 1216]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1216 ? 552 : 844 }, reducedMotion: 'reduce' });
    let member = false;
    await context.addInitScript(() => localStorage.setItem('treasury.app-tour.dismissed', 'true'));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!url.pathname.includes('/api/')) {
        if (url.hostname !== '127.0.0.1') return route.abort();
        return route.continue();
      }
      let body = [];
      if (url.pathname.endsWith('/auth/refresh')) {
        return route.fulfill({ status: member ? 200 : 401, json: member ? { token, user, csrfToken: 'test' } : {} });
      }
      if (url.pathname.endsWith('/auth/me')) body = user;
      if (url.pathname.endsWith('/auth/forgot-password')) body = { message: 'Si el correo está registrado, recibirás las instrucciones.' };
      return route.fulfill({ json: body });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const inspect = async name => {
      await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true });
      const geometry = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        overflow: [...document.querySelectorAll('main input, main form, main h1, .public-home__header')].filter(el => {
          const r = el.getBoundingClientRect();
          return r.width && (r.left < -1 || r.right > innerWidth + 1);
        }).map(el => el.className || el.tagName),
      }));
      results.push({ name, width, ...geometry, errors: [...errors] });
    };
    for (const path of ['/', '/login', '/olvide-password']) {
      await page.goto(`http://127.0.0.1:5178${path}`);
      await page.locator('#app-boot-loader').waitFor({ state: 'hidden' });
      await inspect(path === '/' ? 'guest' : path.slice(1));
      if (path !== '/') {
        await page.getByRole('button', { name: path === '/login' ? 'Ingresar' : 'Enviar instrucciones', exact: true }).click();
        await inspect(`${path.slice(1)}-errors`);
      }
      if (path === '/olvide-password') {
        await page.getByLabel('Correo', { exact: true }).fill('review@example.test');
        await page.getByRole('button', { name: 'Enviar instrucciones', exact: true }).click();
        await page.getByText('Revisa tu correo', { exact: true }).waitFor();
        await inspect('recovery-success');
      }
    }
    member = true;
    await page.goto('http://127.0.0.1:5178/');
    await page.locator('.public-home--member').waitFor();
    await page.locator('#app-boot-loader').waitFor({ state: 'hidden' });
    await inspect('member');
    if (await page.getByRole('button', { name: 'Abrir menú', exact: true }).isVisible()) {
      await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
      await inspect('member-menu');
      await page.keyboard.press('Escape');
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
const failures = results.filter(result => result.scrollWidth > result.width || result.overflow.length || result.errors.length);
console.log(JSON.stringify({ views: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
