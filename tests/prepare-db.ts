import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Creates a fresh SQLite database file for tests and applies all migrations to it. */
export function prepareTestDb(url: string) {
  if (!url.startsWith("file:") || !/test|e2e/i.test(url)) throw new Error(`Refusing to prepare ${url}: tests only use file databases named *test* or *e2e*`);
  const file = path.resolve(url.slice("file:".length));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (const f of [file, `${file}-journal`, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
  const dir = path.resolve("prisma/migrations");
  for (const m of fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).sort()) {
    execSync(`npx prisma db execute --url "file:${file}" --file "${path.join(dir, m, "migration.sql")}"`, { stdio: "pipe" });
  }
  return `file:${file}`;
}
