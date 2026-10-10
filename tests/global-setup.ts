import { execSync } from "node:child_process";

/** Apply migrations to the dedicated test database (non-destructive; never touches the dev database). */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://qollab:qollab@localhost:5432/qollab_test?schema=public";
  if (!/test/i.test(url)) throw new Error("Refusing to run tests against a database whose URL does not contain 'test'");
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
}
