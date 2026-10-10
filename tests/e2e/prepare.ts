import { execSync } from "node:child_process";
import path from "node:path";
import { prepareTestDb } from "../prepare-db";

/** Fresh SQLite e2e database (migrations + deterministic demo seed). Runs right before the e2e server starts. */
const url = prepareTestDb(`file:${path.resolve(".tmp/e2e.db")}`);
execSync("npx tsx prisma/seed.ts", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
console.log("e2e database ready");
