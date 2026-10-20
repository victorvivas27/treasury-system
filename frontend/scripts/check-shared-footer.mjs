import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Local audit, with synthetic responses for every API request.
const output = 'demo-output/shared-footer';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const user = { id: 77, nombre: 'Usuario de prueba', correo: 'footer@example.test', rol: 'USER', enabled: true, profileImageType: 'INITIALS' };
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
try {
  await Promise.all([320, 375, 390, 430, 768, 1024, 1216].map(async width => {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({ viewport: { width, height: width === 1216 ? 552 : 844 }, reducedMotion: 'reduce' });
      try {
        await context.addInitScript(theme => localStorage.setItem('app-theme', theme), theme);
        let authenticated = false;
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (!url.pathname.includes('/api/')) {
            return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
          }
          if (url.pathname.endsWith('/auth/refresh')) return route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? { token, user, csrfToken: 'test' } : {} });
          let body = [];
          if (url.pathname.endsWith('/auth/me')) body = user;
          if (url.pathname.endsWith('/perfil')) body = { primaryGuardian: false, obligations: [] };
          return route.fulfill({ json: body });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const snapshots = [];
        for (const name of ['guest', 'member', 'profile']) {
          authenticated = name !== 'guest';
          await page.goto(`http://127.0.0.1:5178/${name === 'profile' ? 'profile' : ''}`);
          const footer = page.locator('footer.public-home__footer');
          await footer.waitFor();
          await page.locator('#app-boot-loader').waitFor({ state: 'hidden' });
          if (name === 'profile') {
            const skip = page.getByRole('button', { name: 'Omitir', exact: true });
            await skip.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
            if (await skip.isVisible()) await skip.click();
          }
          await footer.scrollIntoViewIfNeeded();
          const styles = await footer.evaluate(el => {
            const selectors = ['', '.public-home__footer-content', '.public-home__footer-home-link', '.public-home__footer-home-link img', '.public-home__signature', '.public-home__signature-icon', '.public-home__signature-copy small', '.public-home__signature-copy strong', '.public-home__signature-links a', '.public-home__copyright'];
            const properties = ['display', 'fontSize', 'color', 'backgroundColor', 'backgroundImage', 'borderRadius', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap', 'gridTemplateColumns'];
            return Object.fromEntries(selectors.map(selector => {
              const node = selector ? el.querySelector(selector) : el;
              const style = getComputedStyle(node);
              return [selector || 'footer', Object.fromEntries(properties.map(key => [key, style[key]]))];
            }));
          });
          const overflow = await footer.evaluate(el => {
            const r = el.getBoundingClientRect();
            return r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1;
          });
          expect(overflow).toBe(false);
          await expect(footer.getByRole('link', { name: 'victorjaviervivas@gmail.com' })).toBeVisible();
          await footer.screenshot({ path: `${output}/${name}-${theme}-${width}.png` });
          snapshots.push({ name, styles });
        }
        // The guest login link is intentionally conditional; all common parts match.
        expect(snapshots[1].styles).toEqual(snapshots[2].styles);
        expect(snapshots[0].styles).toEqual(snapshots[1].styles);
        expect(errors).toEqual([]);
        results.push({ width, theme, equal: true });
      } finally { await context.close(); }
    }
  }));
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify({ comparisons: results.length, pages: results.length * 3, equal: true }));
