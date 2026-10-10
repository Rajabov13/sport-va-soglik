/**
 * Zero-config database bootstrap: the SQLite file is created by `prisma migrate deploy`;
 * this script loads the demo data when the database is still empty. Existing data is never touched.
 */
import { execSync } from "node:child_process";
import { db } from "../src/server/db";

async function main() {
  const users = await db.user.count();
  if (users > 0) {
    console.log(`✓ Database ready (${users} users)`);
    return;
  }
  console.log("› Empty database — loading demo data…");
  await db.$disconnect();
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
