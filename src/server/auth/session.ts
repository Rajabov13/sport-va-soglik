import type { Role, UserStatus } from "@prisma/client";
import { db } from "@/server/db";
import { env } from "@/config/env";
import { generateToken, hashToken } from "./tokens";
import { SESSION_COOKIE } from "./constants";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  locale: string;
  avatarUrl: string | null;
  isDemo: boolean;
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  locale: true,
  avatarUrl: true,
  isDemo: true,
  deletedAt: true,
} as const;

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function createSession(userId: string, meta: { userAgent?: string | null; ip?: string | null } = {}) {
  const token = generateToken();
  const maxAgeSeconds = env.sessionMaxAgeDays * 24 * 60 * 60;
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + maxAgeSeconds * 1000),
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ip: meta.ip ?? null,
    },
  });
  return { token, maxAgeSeconds, cookieName: SESSION_COOKIE };
}

/** Resolve a session token into the current user. Returns null for expired, unknown, suspended or deleted users. */
export async function getUserBySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: userSelect } },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const { user } = session;
  if (user.deletedAt || user.status === "SUSPENDED") return null;

  // Touch the session at most every 10 minutes to keep writes cheap.
  if (Date.now() - session.lastUsedAt.getTime() > 10 * 60 * 1000) {
    await db.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
    await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    locale: user.locale,
    avatarUrl: user.avatarUrl,
    isDemo: user.isDemo,
  };
}

export async function destroySession(token: string | undefined | null) {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function destroyAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}
