import { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { SESSION_COOKIE } from "@/server/auth/constants";
import { ACHIEVEMENTS } from "@/server/domain/gamification";

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Clears all rows between test files. Guarded so it can only ever run against the test database. */
export async function resetDb() {
  if (!/test/i.test(process.env.DATABASE_URL ?? "")) throw new Error("resetDb may only run against the test database");
  const tables = await db.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations'",
  );
  await db.$executeRawUnsafe("PRAGMA foreign_keys = OFF");
  for (const t of tables) await db.$executeRawUnsafe(`DELETE FROM "${t.name}"`);
  await db.$executeRawUnsafe("PRAGMA foreign_keys = ON");
}

export async function seedReference() {
  const medicine = await db.category.create({
    data: { slug: "medicine", icon: "Pill", color: "#ef4444", nameUz: "Dori-darmon", nameRu: "Лекарства", nameEn: "Medicine", relatedSkills: ["driving", "first-aid", "medical"], sortOrder: 1 },
  });
  const education = await db.category.create({
    data: { slug: "education", icon: "GraduationCap", color: "#8b5cf6", nameUz: "Taʼlim", nameRu: "Образование", nameEn: "Education", relatedSkills: ["tutoring"], sortOrder: 2 },
  });
  const tashkent = await db.location.create({ data: { slug: "toshkent", city: "Toshkent", region: "Toshkent", latitude: 41.2995, longitude: 69.2401 } });
  for (const a of ACHIEVEMENTS) await db.achievement.create({ data: a });
  return { medicine, education, tashkent };
}

let counter = 0;
export async function createUser(role: Role, opts: { volunteer?: { categoryIds: string[]; skills?: string[]; lat?: number; lng?: number; completed?: number }; status?: "ACTIVE" | "SUSPENDED"; password?: string } = {}) {
  counter += 1;
  const user = await db.user.create({
    data: {
      email: `${role.toLowerCase()}${counter}-${Date.now()}@example.com`,
      name: `${role} Tester ${counter}`,
      role,
      status: opts.status ?? "ACTIVE",
      passwordHash: await hashPassword(opts.password ?? "Password123"),
      profile: { create: {} },
    },
  });
  if (role === "VOLUNTEER") {
    const v = opts.volunteer ?? { categoryIds: [] };
    const vp = await db.volunteerProfile.create({
      data: {
        userId: user.id,
        skills: v.skills ?? ["driving", "medical"],
        latitude: v.lat ?? 41.3,
        longitude: v.lng ?? 69.24,
        radiusKm: 15,
        isAvailableNow: true,
        completedCount: v.completed ?? 0,
        categories: { create: v.categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
    await db.volunteerAvailability.createMany({ data: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ volunteerProfileId: vp.id, dayOfWeek: d, startMinute: 0, endMinute: 1440 })) });
  }
  const { token } = await createSession(user.id);
  return { user, cookie: `${SESSION_COOKIE}=${token}` };
}

export async function call(
  handler: Handler,
  opts: { method?: string; path?: string; body?: unknown; cookie?: string; params?: Record<string, string>; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const req = new NextRequest(`http://localhost:3000${opts.path ?? "/api/test"}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const json = (await res.json().catch(() => null)) as { data?: unknown; error?: { code: string; fieldErrors?: Record<string, string[]> } } | null;
  return { status: res.status, json, res };
}

export function requestPayload(categoryId: string, locationId: string, overrides: Record<string, unknown> = {}) {
  return {
    title: "Keksa onaxonga dori olib kelish kerak",
    description: "78 yoshli onaxon yurish qiyin, yaqin dorixonadan dori olib kelib berish kerak.",
    categoryId,
    urgency: "HIGH",
    address: "Chilonzor 9-mavze, 12-uy",
    locationId,
    latitude: 41.285,
    longitude: 69.204,
    contactPreferences: ["CHAT"],
    peopleCount: 1,
    estimatedHours: 1,
    imageIds: [],
    ...overrides,
  };
}
