import { defineConfig, devices } from "@playwright/test";

const withWebServer = process.env.DEMO_SKIP_WEBSERVER !== "true";

export default defineConfig({
  testDir: "./demo",
  timeout: 60_000,
  outputDir: "./demo-output/playwright",
  fullyParallel: false,
  use: {
    baseURL: process.env.DEMO_BASE_URL ?? "http://127.0.0.1:5174",
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    video: "on",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(withWebServer
    ? {
      webServer: {
        command: "pnpm exec vite --host 127.0.0.1 --port 5174",
        url: "http://127.0.0.1:5174",
        reuseExistingServer: true,
        timeout: 120_000,
      },
    }
    : {}),
});
