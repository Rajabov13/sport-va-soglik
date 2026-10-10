import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const DATABASE_URL = `file:${path.resolve(".tmp/e2e.db")}`;
const chromiumPath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-US",
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    // Requires `npm run build` beforehand. The e2e database is rebuilt before the server opens it.
    command: `npx tsx tests/e2e/prepare.ts && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL,
      APP_URL: `http://localhost:${PORT}`,
      DEMO_MODE: "true",
      DISABLE_RATE_LIMIT: "true",
      SESSION_SECRET: "e2e-secret-0123456789-0123456789-abcdef",
    },
  },
});
