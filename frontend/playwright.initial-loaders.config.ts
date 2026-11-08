import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './initial-loader-tests',
  outputDir: './build/initial-loaders',
  reporter: 'list',
  timeout: 45000,
  expect: { timeout: 10000 },
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'chrome', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1216, height: 552 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'small-reduced-motion', use: { viewport: { width: 360, height: 640 }, reducedMotion: 'reduce' } },
  ],
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173', reuseExistingServer: true,
  },
});
