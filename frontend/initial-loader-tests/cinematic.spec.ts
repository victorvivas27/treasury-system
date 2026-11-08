import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('cinematic coordinates artwork, real milestones and a bounded exit', async ({ page }) => {
  // Keep timing checks independent of remote artwork availability.
  await page.route('https://storage.googleapis.com/**', route => route.fulfill({
    contentType: 'image/png', body: readFileSync('public/icono-tesoreria.png'),
  }));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/src/main.tsx', async route => { await gate; await route.continue(); });
  await page.route('**/auth/refresh', route => route.fulfill({ status: 401, body: '{}' }));
  await page.goto('/?loader=cinematic&loaderDelay=0', { waitUntil: 'commit' });
  const loader = page.locator('#app-boot-loader');
  await expect(loader).toHaveAttribute('data-variant', 'cinematic');
  await expect(loader).toHaveAttribute('data-stage', '2');
  await expect(loader.locator('.cinematic-counter, .cinematic-number, .cinematic-rule, .boot-progress')).toHaveCount(0);
  await expect(loader).not.toContainText('%');
  const activeImage = loader.locator('.cinematic-scene.is-active img');
  await expect(loader.locator('.cinematic-scene')).toHaveCount(9);
  const initialTitle = await loader.locator('.cinematic-title').textContent();
  const initialSource = await activeImage.getAttribute('src');
  await expect.poll(() => activeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), { timeout: 15000 }).toBe(true);
  await activeImage.evaluate((image: HTMLImageElement) => image.decode());
  await page.screenshot({ path: test.info().outputPath('cinematic-start.png'), animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await loader.locator('.cinematic-frame').evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  if (page.viewportSize()?.width === 360) {
    await page.clock.runFor(8000);
    await expect(loader.locator('.cinematic-title')).toHaveText(initialTitle!);
    expect(await loader.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  } else {
    await page.clock.runFor(4600);
    await expect(loader.locator('.cinematic-scene').nth(1)).toHaveClass(/is-active/);
    await page.clock.runFor(650);
    await expect(loader.locator('.cinematic-scene.is-active img')).not.toHaveAttribute('src', initialSource!);
    await page.screenshot({ path: test.info().outputPath('cinematic-second-scene.png'), animations: 'disabled' });
  }
  await expect(loader).toHaveAttribute('data-stage', '2');
  await page.evaluate(() => window.addEventListener('app:boot-ready', () => {
    document.documentElement.dataset.observedStage = document.getElementById('app-boot-loader')?.dataset.stage;
  }, { once: true }));
  release();
  await page.clock.resume();
  await expect(page.locator('html')).toHaveAttribute('data-observed-stage', '3', { timeout: 15000 });
  await expect(loader).toHaveCount(0, { timeout: 1500 });
  await expect(page.locator('#root')).toHaveCSS('opacity', '1');
});

test('unavailable cinematic images do not block startup or cause a boot error', async ({ page }) => {
  await page.route('https://storage.googleapis.com/**', route => route.abort());
  await page.route('**/auth/refresh', route => route.fulfill({ status: 401, body: '{}' }));
  await page.goto('/?loader=cinematic&loaderDelay=0');
  await expect(page.locator('#app-boot-loader')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('#root')).toHaveClass(/boot-revealed/);
});
