import { test, expect } from '@playwright/test';

test('login action preview is visible, accessible and sends no credentials', async ({ page }) => {
  let loginRequests = 0;
  await page.route('**/auth/refresh', route => route.fulfill({ status: 401, body: '{}' }));
  await page.route('**/auth/login', route => { loginRequests++; return route.abort(); });
  await page.goto('/login?loaderDelay=0&actionPreview=login');
  await expect(page.locator('#app-boot-loader')).toHaveCount(0);
  const button = page.getByRole('button', { name: 'Tu comunidad te espera' });
  await expect(button).toBeVisible();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button.locator('.login-action-feedback__copy')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await button.screenshot({ path: test.info().outputPath('login-door-button.png') });
  await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeDisabled({ timeout: 25000 });
  expect(loginRequests).toBe(0);
});
