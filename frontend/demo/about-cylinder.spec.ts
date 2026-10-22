import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const text = 'Nos mueve la alegría de acompañarnos, compartir responsabilidades y construir una comunidad en la que cada familia puede participar. '.repeat(5);
const sections = ['Juntos hacemos comunidad', 'La confianza nos une', 'Crecer y compartir', 'Cada familia cuenta', 'Un futuro compartido'].map((title, i) => ({ id: i + 1, title, description: text, highlightedPhrase: 'Lo construimos entre todos', icon: 'HEART', accentColor: i % 2 ? 'GREEN' : 'ORANGE', featured: i === 0, visible: true, displayOrder: i, createdAt: '', updatedAt: '' }));
for (const viewport of [{ width: 1216, height: 552 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 640 }, { width: 608, height: 276 }]) {
  test(`about cylinder ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const user = { id: 77, nombre: 'Familia de prueba', correo: 'carousel@example.test', rol: 'USER', enabled: true, accountNonLocked: true, emailVerifiedAt: '2026-01-01', profileImageType: 'INITIALS' };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.correo, exp: 2000000000 })).toString('base64url')}.test`;
    await page.route('**/tesoreria/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith('/auth/refresh') ? { token, user, csrfToken: 'test' } : path.endsWith('/auth/me') ? user : path.endsWith('/community/about') ? sections : path.endsWith('/configuracion-general/curso') ? { course: '1A', schoolYear: 2026, history: [] } : [];
      await route.fulfill({ json: body });
    });
    await page.goto('/#sobre-nosotros');
    const region = page.getByRole('region', { name: 'Lo que nos mueve' });
    await expect(region).toBeVisible();
    await region.scrollIntoViewIfNeeded();
    await expect(page.getByText('Nuestro manifiesto', { exact: true })).toHaveCount(0);
    await expect(region.getByRole('group')).toHaveAccessibleName(`1 de 5: ${sections[0].title}`);
    if (viewport.width >= 1024) {
      await expect(region.getByRole('button', { name: 'Mensaje siguiente', exact: true })).toBeVisible();
      expect(await region.locator('.is-current').evaluate(el => getComputedStyle(el).width)).toBe('360px');
      await region.getByRole('button', { name: 'Mensaje siguiente', exact: true }).click();
      await expect(region.getByRole('group')).toHaveAccessibleName(`2 de 5: ${sections[1].title}`);
      await page.waitForTimeout(650);
      await region.getByRole('button', { name: 'Mensaje anterior', exact: true }).click();
      await expect(region.getByRole('group')).toHaveAccessibleName(`1 de 5: ${sections[0].title}`);
      await page.waitForTimeout(650);
    } else {
      await expect(region.getByRole('button', { name: 'Mensaje siguiente', exact: true })).toHaveCount(0);
      expect(await region.locator('.is-current').evaluate(el => getComputedStyle(el).width)).toBe('220px');
    }
    await region.locator('.about-cylinder__stage').focus();
    await page.keyboard.press('ArrowRight');
    await expect(region.getByRole('group')).toHaveAccessibleName(`2 de 5: ${sections[1].title}`);
    await page.waitForTimeout(650);
    const cardAccent = await region.locator('.is-current').evaluate(el => getComputedStyle(el).getPropertyValue('--card-accent').trim());
    await region.getByRole('button', { name: 'Leer más', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.locator('article').evaluate(el => getComputedStyle(el).getPropertyValue('--card-accent').trim())).toBe(cardAccent);
    await expect(dialog.locator('p')).toHaveText(text);
    const modalBox = await dialog.locator('article').boundingBox();
    expect(modalBox!.x).toBeGreaterThanOrEqual(0);
    expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(viewport.width);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(region.locator('.about-cylinder__number')).toHaveCount(0);
    const stage = region.locator('.about-cylinder__stage');
    await stage.focus(); await page.keyboard.press('End');
    await expect(region.getByRole('group')).toHaveAccessibleName(`5 de 5: ${sections[4].title}`);
    await page.waitForTimeout(650);
    await page.keyboard.press('Home'); await page.waitForTimeout(650);
    // Tapping a visible side card centers it.
    await region.locator('.about-cylinder__card').nth(1).click({ force: true });
    await expect(region.getByRole('group')).toHaveAccessibleName(`2 de 5: ${sections[1].title}`);
    await page.waitForTimeout(650);
    await stage.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
    const box = await stage.boundingBox();
    const startX = box!.x + box!.width / 2;
    const startY = Math.max(90, Math.min(viewport.height - 50, box!.y + 120));
    const beforeHover = await stage.locator('.about-cylinder__card').first().getAttribute('style');
    await page.mouse.move(startX - 60, startY); await page.mouse.move(startX + 60, startY);
    expect(await stage.locator('.about-cylinder__card').first().getAttribute('style')).toBe(beforeHover);
    const beforeWheel = await region.getByRole('group').getAttribute('aria-label');
    await page.mouse.move(startX, startY);
    await page.mouse.wheel(245, 0);
    await page.waitForTimeout(800);
    expect(await region.getByRole('group').getAttribute('aria-label')).not.toBe(beforeWheel);
    // Native touch input exercises Pointer Events and preserves vertical page scrolling.
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const beforeTouch = await region.getByRole('group').getAttribute('aria-label');
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY }] });
    for (let i = 1; i <= 8; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - i * 20, y: startY }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(700);
    expect(await region.getByRole("group").getAttribute("aria-label")).not.toBe(beforeTouch);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const current = region.locator('.is-current');
    const cardBox = await current.boundingBox();
    expect(cardBox!.x).toBeGreaterThanOrEqual(0);
    expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(viewport.width);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await region.locator('.about-cylinder__stage').focus();
    await page.keyboard.press('ArrowRight');
    expect(await stage.evaluate(el => getComputedStyle(el.querySelector('.about-cylinder__ring')!).transform)).toBe('none');
    const active = await current.getAttribute('aria-label');
    await page.waitForTimeout(1100);
    expect(await current.getAttribute('aria-label')).toBe(active);
    await mkdir('demo-output/about-cylinder', { recursive: true });
    await region.screenshot({ path: `demo-output/about-cylinder/${viewport.width}.png` });
    expect(errors).toEqual([]);
  });
}
