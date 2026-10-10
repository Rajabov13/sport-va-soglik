import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

/**
 * Embedded SQLite database — no external database service is required.
 *
 * - Locally / on a regular Node server the file lives at `prisma/qollab.db`.
 * - On read-only serverless hosts (Vercel) the database built during `npm run build`
 *   is copied to `/tmp` on cold start so it can be written to.
 * - `DATABASE_URL=file:...` overrides the location (used by tests).
 */
function resolveDatabaseUrl() {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv?.startsWith("file:")) return fromEnv;

  const bundled = path.join(process.cwd(), "prisma", "qollab.db");
  if (!process.env.VERCEL) return `file:${bundled}`;

  const writable = path.join("/tmp", "qollab.db");
  if (!fs.existsSync(writable) && fs.existsSync(bundled)) fs.copyFileSync(bundled, writable);
  return `file:${writable}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = typeof db;
export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
