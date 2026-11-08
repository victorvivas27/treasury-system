import { test, expect } from '@playwright/test';

test('video plays muted, fits the viewport and exits when the app is ready', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/src/main.tsx', async route => { await gate; await route.continue(); });
  await page.route('**/auth/refresh', route => route.fulfill({ status: 401, body: '{}' }));
  await page.goto('/?loader=video&loaderDelay=0', { waitUntil: 'commit' });
  const loader = page.locator('#app-boot-loader');
  const video = loader.locator('video');
  await expect(loader).toHaveAttribute('data-variant', 'video');
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(loader.locator('.boot-video-fallback img')).toHaveCount(0);
  if (page.viewportSize()?.width === 360) {
    await expect(video).not.toHaveAttribute('src');
    await expect(loader.locator('.boot-video-fallback')).toBeVisible();
  } else if ((page.viewportSize()?.width || 0) <= 600) {
    await expect(video).not.toHaveAttribute('src');
    const artwork = loader.locator('.boot-mobile-artwork');
    await expect(artwork).toBeVisible();
    await expect(artwork).toHaveAttribute('src', /imagen_login_movil\.webp$/);
  } else {
    await expect(loader).toHaveClass(/is-playing/, { timeout: 15000 });
    const media = await video.evaluate((element: HTMLVideoElement) => ({
      muted: element.muted, paused: element.paused, width: element.videoWidth,
      height: element.videoHeight, duration: element.duration,
    }));
    expect(media.muted).toBe(true);
    expect(media.paused).toBe(false);
    expect(media.width).toBeGreaterThan(0);
    expect(media.height).toBeGreaterThan(0);
    expect(media.duration).toBeGreaterThan(0);
    await test.info().attach('video-metadata', { body: JSON.stringify(media), contentType: 'application/json' });
  }
  await expect(video).toHaveCSS('object-fit', 'cover');
  await expect(loader.locator('.cinematic-title')).toContainText('Cada aporte');
  const videoBounds = await loader.boundingBox();
  expect(videoBounds?.width).toBe(page.viewportSize()?.width);
  expect(videoBounds?.height).toBe(page.viewportSize()?.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('video-loader.png') });
  release();
  await expect(loader).toHaveCount(0);
  await expect(page.locator('#root')).toHaveClass(/boot-revealed/);
  await expect(page.locator('.boot-test-panel')).toHaveCount(0);
});

test('unavailable video falls back without blocking startup', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/src/main.tsx', async route => { await gate; await route.continue(); });
  await page.route('**/src/assets/video/**', route => route.abort());
  await page.route('**/auth/refresh', route => route.fulfill({ status: 401, body: '{}' }));
  await page.goto('/?loader=video&loaderDelay=0', { waitUntil: 'commit' });
  const loader = page.locator('#app-boot-loader');
  await expect(loader.locator('.boot-video-fallback')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  release();
  await expect(loader).toHaveCount(0);
  await expect(page.locator('#root')).toHaveClass(/boot-revealed/);
});
