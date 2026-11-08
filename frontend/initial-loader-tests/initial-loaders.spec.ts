import { test, expect } from '@playwright/test';

const variants = ['cinematic', 'video'];
for (const variant of variants) {
  test(`${variant}: first paint, ready and reload`, async ({ page }) => {
    // Hold only the app module, leaving the HTML boot experience intact.
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/src/main.tsx', async route => { await gate; await route.continue(); });
    // A rejected session refresh is an expected anonymous startup path.
    await page.route('**/auth/refresh', route => route.fulfill({ status: 401, body: '{}' }));
    await page.goto(`/?loader=${variant}&loaderDelay=0`, { waitUntil: 'commit' });
    const loader = page.locator('#app-boot-loader');
    await expect(loader).toHaveAttribute('data-variant', variant);
    await expect(loader).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(loader.locator('.app-startup__motion')).toHaveCount(0);
    if (page.viewportSize()?.width === 360) {
      const animations = await loader.evaluate(element => element.getAnimations({ subtree: true }).length);
      expect(animations).toBe(0);
    }
    await page.screenshot({ path: test.info().outputPath(`${variant}.png`) });
    release();
    await expect(loader).toHaveCount(0);
    await expect(page.locator('#root')).toHaveClass(/boot-revealed/);
    await expect(page.locator('#root')).toHaveCSS('opacity', '1');
    await page.reload();
    await expect(loader).toHaveCount(0);
    await expect(page.locator('.boot-test-panel')).toHaveCount(0);
    await page.goto(`/?loader=${variant === 'video' ? 'cinematic' : 'video'}&loaderDelay=0`);
    await expect(page).toHaveURL(new RegExp(`loader=${variant === 'video' ? 'cinematic' : 'video'}`));
    await expect(loader).toHaveCount(0);
  });

  test(`${variant}: failed application module offers retry`, async ({ page }) => {
    await page.route('**/src/main.tsx', route => route.abort());
    await page.goto(`/?loader=${variant}&loaderDelay=0`);
    await expect(page.getByRole('alert')).toContainText('No se pudo completar el inicio');
    await page.unroute('**/src/main.tsx');
    await page.route('**/auth/refresh', route => route.fulfill({ status: 401, body: '{}' }));
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('#app-boot-loader')).toHaveCount(0);
  });
}

test('stalled initialization offers recovery and can still finish', async ({ page }) => {
  await page.clock.install();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/src/main.tsx', async route => { await gate; await route.continue(); });
  await page.goto('/?loader=cinematic', { waitUntil: 'commit' });
  await expect(page.locator('#app-boot-loader')).toHaveAttribute('data-variant', 'cinematic');
  await page.clock.fastForward(30001);
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  release();
  await page.clock.resume();
  await expect(page.locator('#app-boot-loader')).toHaveCount(0);
  await expect(page.locator('#root')).toHaveCSS('opacity', '1');
});

test('unknown selection defaults to video', async ({ page }) => {
  await page.route('**/src/main.tsx', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto('/?loader=unknown', { waitUntil: 'commit' });
  await expect(page.locator('#app-boot-loader')).toHaveAttribute('data-variant', 'video');
});
