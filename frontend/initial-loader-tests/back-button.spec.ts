import { test, expect } from '@playwright/test';

test('login back button retains compact geometry', async ({ page }) => {
  await page.goto('/login?loaderDelay=0&actionPreview=login');
  const back = page.getByRole('button', { name: 'Volver', exact: true });
  await expect(back).toBeVisible();
  await page.waitForTimeout(1500);
  const mobile = (page.viewportSize()?.width ?? 1216) <= 768;
  await expect(back.locator('.back-icon__desktop')).toBeVisible({ visible: !mobile });
  await expect(back.locator('.back-icon__mobile')).toBeVisible({ visible: mobile });
  const bounds = await back.boundingBox();
  expect(bounds!.height).toBeLessThanOrEqual(52);
  expect(bounds!.width).toBeLessThan(140);
  await page.screenshot({ path: test.info().outputPath('back.png') });
});
