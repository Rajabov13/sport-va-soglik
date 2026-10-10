import { execSync } from "node:child_process";

/** Prepare the dedicated e2e database: apply migrations and load the deterministic demo seed. */
export default function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://qollab:qollab@localhost:5432/qollab_e2e?schema=public";
  if (!/e2e|test/i.test(url)) throw new Error("Refusing to seed a database whose URL does not contain 'e2e' or 'test'");
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" };
  execSync("npx prisma migrate deploy", { stdio: "pipe", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "pipe", env });
}
