import { defineConfig, devices } from "@playwright/test";
import { getPerformanceEnv } from "../helpers/performanceEnv";

const env = getPerformanceEnv();

export default defineConfig({
  testDir: "../navigation",
  outputDir: "../test-results",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "../reports/playwright-html", open: "never" }],
  ],
  use: {
    baseURL: env.baseUrl,
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
    serviceWorkers: "block",
    ignoreHTTPSErrors: false,
    launchOptions: {
      args: [
        "--disable-accelerated-2d-canvas",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-webgl",
        "--no-sandbox",
      ],
    },
    viewport: { width: 1440, height: 1000 },
    ...devices["Desktop Chrome"],
  },
});
