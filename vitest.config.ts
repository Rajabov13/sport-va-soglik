import { defineConfig } from "vitest/config";
import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";

// Tests run against their own throwaway SQLite file.
const TEST_DATABASE_URL = `file:${path.resolve(".tmp/test.db")}`;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // API tests share one database, so run files sequentially.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      SESSION_SECRET: "test-secret-0123456789-0123456789-abcdef",
      DISABLE_RATE_LIMIT: "true",
      DEMO_MODE: "true",
      APP_URL: "http://localhost:3000",
      NODE_ENV: "test",
      UPLOAD_DIR: ".tmp/test-uploads",
    },
  },
});
