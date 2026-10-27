import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./security-tests",
  testMatch: "**/*.pw.ts",
  outputDir: "./build/security-browser/results",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "build/security-browser/results.json" }]],
  use: {
    channel: process.env.PHASE4_BROWSER_CHANNEL,
    baseURL: "http://127.0.0.1:5186",
    viewport: { width: 1216, height: 552 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
