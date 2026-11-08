import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

test('development defaults to video without flashing the retired loading image', async ({ page }) => {
  await page.route('**/src/main.tsx', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  for (const query of ['', '?loader=original', '?loader=splash', '?loader=skeleton', '?loader=progress']) {
    await page.goto(`/${query}`);
    await expect(page.locator('#app-boot-loader')).toHaveAttribute('data-variant', 'video');
    await expect(page.locator('.app-loader, .react-loading-skeleton')).toHaveCount(0);
    await expect(page.locator('body img')).toHaveCount(0);
  }
});

test('production HTML ignores loader parameters and excludes the panel', async ({ page }) => {
  test.skip(!existsSync('dist/index.html'), 'Build with pnpm build before validating production HTML');
  const html = readFileSync('dist/index.html', 'utf8');
  await page.route('**/assets/**', route => route.abort());
  await page.route('**/?loader=*', route => route.fulfill({ contentType: 'text/html', body: html }));
  for (const variant of ['cinematic', 'video']) {
    await page.goto(`/?loader=${variant}&loaderDelay=0`);
    await expect(page.locator('#app-boot-loader')).toHaveCount(0);
    await expect(page.locator('.boot-test-panel')).toHaveCount(0);
  }
});

test('all variants respect the saved light theme', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('app-theme', 'light'));
  await page.route('**/src/main.tsx', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  for (const variant of ['cinematic', 'video']) {
    await page.goto(`/?loader=${variant}&loaderDelay=0`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('#app-boot-loader')).toHaveAttribute('data-variant', variant);
    const colors = await page.locator('#app-boot-loader').evaluate(element => ({
      loader: getComputedStyle(element).backgroundColor,
      body: getComputedStyle(document.body).backgroundColor,
    }));
    expect(colors.loader).toBe(colors.body);
    await page.screenshot({ path: test.info().outputPath(`${variant}-light.png`) });
  }
});
