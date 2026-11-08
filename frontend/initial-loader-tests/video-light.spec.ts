import { test, expect } from '@playwright/test';

test('video 02 reveals focused words and dissolves into the app', async ({ page }) => {
  await page.route('**/auth/refresh', route => route.fulfill({ status: 401, body: '{}' }));
  await page.goto('/?loader=video-light&loaderDelay=20000', { waitUntil: 'commit' });
  const loader = page.locator('#app-boot-loader');
  await expect(loader).toHaveAttribute('data-variant', 'video-light');
  const video = loader.locator('video');
  if (page.viewportSize()?.width === 360) {
    await expect(video).not.toHaveAttribute('src');
    expect(await loader.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  } else if ((page.viewportSize()?.width || 0) <= 600) {
    await expect(video).not.toHaveAttribute('src');
    await expect(loader.locator('.boot-mobile-artwork')).toBeVisible();
    await expect(loader.locator('.cinematic-word').first()).toHaveCSS('animation-name', 'video-light-focus');
  } else {
    await expect(video).toHaveAttribute('src', /tesoreria_animado_02\.mp4$/);
    await expect(loader).toHaveClass(/is-playing/);
    await expect(loader.locator('.cinematic-word').first()).toHaveCSS('animation-name', 'video-light-focus');
  }
  await expect(loader.locator('.cinematic-word').last()).toHaveCSS('opacity', '1');
  await expect(video).toHaveCSS('transform', 'none');
  await expect(video).toHaveCSS('animation-name', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('video-02-reveal.png') });
  await page.goto('/?loader=video-light&loaderDelay=0');
  await expect(page.locator('#app-boot-loader')).toHaveCount(0);
  await expect(page.locator('#root')).toHaveClass(/boot-revealed/);
});
