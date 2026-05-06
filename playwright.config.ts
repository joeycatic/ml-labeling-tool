import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
  },
  globalSetup: "./tests/e2e/global-setup.cjs",
  webServer: {
    command: "npm run dev:e2e",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
