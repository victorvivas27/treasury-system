import { defineConfig } from '@playwright/test';
const productionPreview = process.env.STARTUP_PRODUCTION_PREVIEW === 'true';
const port = productionPreview ? 5174 : 5173;

export default defineConfig({
  testDir: './initial-loader-tests',
  outputDir: productionPreview ? './build/startup-production' : './build/initial-loaders',
  reporter: 'list',
  timeout: 45000,
  expect: { timeout: 10000 },
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}`, channel: 'chrome', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1216, height: 552 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'small-reduced-motion', use: { viewport: { width: 360, height: 640 }, reducedMotion: 'reduce' } },
  ],
  webServer: {
    command: `pnpm exec vite ${productionPreview ? 'preview ' : ''}--host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`, reuseExistingServer: !productionPreview,
  },
});
