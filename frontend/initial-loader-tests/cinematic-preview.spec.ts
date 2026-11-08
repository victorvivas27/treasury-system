import { test, expect } from '@playwright/test';

test('development preview keeps cinematic visible after real readiness and can be disabled', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.route('https://storage.googleapis.com/**', route => route.abort());
  await page.route('**/auth/refresh', route => route.fulfill({ status: 401, body: '{}' }));
  await page.goto('/?loader=cinematic');
  const loader = page.locator('#app-boot-loader');
  await expect.poll(async () => {
    await page.clock.runFor(50);
    return loader.getAttribute('data-stage');
  }).toBe('3');
  await expect(page.locator('#root')).toHaveClass(/boot-revealed/);
  await expect(loader).toBeVisible();
  await expect(loader).not.toHaveClass(/is-leaving/);
  await page.clock.runFor(5000);
  await expect(loader).toBeVisible();
  await page.clock.runFor(6000);
  await expect(loader).toHaveCount(0);
  await page.clock.resume();
  await page.goto('/?loader=cinematic&loaderDelay=0');
  await expect(loader).toHaveCount(0);
});
