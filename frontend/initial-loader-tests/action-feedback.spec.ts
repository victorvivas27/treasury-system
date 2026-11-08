import { test, expect } from '@playwright/test';

test('all action buttons use the same feedback without resizing or shifting siblings', async ({ page }) => {
  await page.route('**/action-button-preview', async route => {
    const response = await route.fetch();
    // Preserve Vite's React initialization while substituting only the test body.
    const html = (await response.text()).replace(/<body>[\s\S]*<\/body>/,
      '<body><div id="root"></div><script type="module" src="/initial-loader-tests/action-feedback.fixture.tsx"></script></body>');
    await route.fulfill({ response, body: html });
  });
  await page.goto('/action-button-preview');
  for (const name of ['Guardar', 'Enviar sugerencia', 'Eliminar']) {
    const button = page.getByRole('button', { name, exact: true });
    const cancel = page.getByRole('button', { name: 'Cancelar', exact: true });
    const before = await button.boundingBox();
    const siblingBefore = await cancel.boundingBox();
    await button.click();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toBeDisabled();
    const after = await button.boundingBox();
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
    const siblingAfter = await cancel.boundingBox();
    expect(Math.abs(siblingAfter!.width - siblingBefore!.width)).toBeLessThanOrEqual(1);
    await expect(button).toHaveCSS('transform', 'none');
    if (await button.locator('.button-label').count()) {
      const textColor = await button.evaluate(element => getComputedStyle(element).color);
      await expect(button.locator('.button-label')).toHaveCSS('color', textColor);
    }
    await expect(cancel).toHaveAttribute('aria-busy', 'false');
    if (page.viewportSize()?.width === 360) {
      await expect(button).toHaveCSS('animation-name', 'none');
    } else {
      await expect(button).toHaveCSS('animation-name', 'action-button-color');
      expect(await button.evaluate(element => getComputedStyle(element, '::after').animationName)).toBe('action-button-border');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`${name}-feedback.png`) });
    await expect(button).toBeEnabled();
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  const save = page.getByRole('button', { name: 'Guardar', exact: true });
  await save.click();
  await expect(save).toHaveAttribute('aria-busy', 'true');
  const lightTextColor = await save.evaluate(element => getComputedStyle(element).color);
  await expect(save.locator('.button-label')).toHaveCSS('color', lightTextColor);
  await expect(save).toBeEnabled();
});
