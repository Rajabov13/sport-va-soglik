import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import { startOfToday } from "@/lib/format";

export interface ImpactStats {
  totalRequests: number;
  completedRequests: number;
  activeVolunteers: number;
  peopleHelped: number;
  helpedToday: number;
  organizations: number;
  avgResponseMinutes: number;
  successRate: number;
  volunteerHours: number;
  impactPoints: number;
  openRequests: number;
}

const notDeleted = { deletedAt: null };

/** Platform-wide impact numbers, computed live from the database. */
export async function getImpactStats(filter: { organizationId?: string } = {}): Promise<ImpactStats> {
  const reqWhere: Prisma.RequestWhereInput = { ...notDeleted, status: { not: "DRAFT" }, ...(filter.organizationId ? { organizationId: filter.organizationId } : {}) };
  const startOfDay = startOfToday();

  const [total, completed, cancelled, open, people, today, volunteers, orgs, response, hours, impact] = await Promise.all([
    db.request.count({ where: reqWhere }),
    db.request.count({ where: { ...reqWhere, status: "COMPLETED" } }),
    db.request.count({ where: { ...reqWhere, status: { in: ["CANCELLED", "REJECTED"] } } }),
    db.request.count({ where: { ...reqWhere, status: { in: ["VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS"] } } }),
    db.request.aggregate({ where: { ...reqWhere, status: "COMPLETED" }, _sum: { peopleCount: true } }),
    db.request.aggregate({ where: { ...reqWhere, status: "COMPLETED", completedAt: { gte: startOfDay } }, _sum: { peopleCount: true } }),
    db.user.count({ where: { role: "VOLUNTEER", status: "ACTIVE", ...notDeleted } }),
    db.organization.count({ where: { status: "VERIFIED", ...notDeleted } }),
    db.requestAssignment.aggregate({ where: { responseMinutes: { not: null }, request: reqWhere }, _avg: { responseMinutes: true } }),
    db.requestAssignment.aggregate({ where: { status: "COMPLETED", request: reqWhere }, _sum: { hoursSpent: true } }),
    db.volunteerProfile.aggregate({ _sum: { impactScore: true } }),
  ]);

  const closed = completed + cancelled;
  return {
    totalRequests: total,
    completedRequests: completed,
    activeVolunteers: volunteers,
    peopleHelped: people._sum.peopleCount ?? 0,
    helpedToday: today._sum.peopleCount ?? 0,
    organizations: orgs,
    avgResponseMinutes: Math.round(response._avg.responseMinutes ?? 0),
    successRate: closed === 0 ? 0 : Math.round((completed / closed) * 100),
    volunteerHours: Math.round(hours._sum.hoursSpent ?? 0),
    impactPoints: impact._sum.impactScore ?? 0,
    openRequests: open,
  };
}

export interface ChartData {
  overTime: { week: string; created: number; completed: number }[];
  categories: { slug: string; nameUz: string; nameRu: string; nameEn: string; color: string; count: number }[];
  volunteerActivity: { week: string; volunteers: number; hours: number }[];
  geography: { city: string; requests: number; completed: number }[];
  urgency: { urgency: string; count: number }[];
}

export async function getChartData(weeks = 12, filter: { organizationId?: string } = {}): Promise<ChartData> {
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
  const orgSql = filter.organizationId ? Prisma.sql`AND r."organizationId" = ${filter.organizationId}` : Prisma.empty;

  const [created, completed, cats, categories, activity, geo, urgency] = await Promise.all([
    db.$queryRaw<{ week: Date; count: bigint }[]>`
      SELECT date_trunc('week', r."createdAt") AS week, COUNT(*)::bigint AS count
      FROM "Request" r WHERE r."deletedAt" IS NULL AND r."status" <> 'DRAFT' AND r."createdAt" >= ${since} ${orgSql}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ week: Date; count: bigint }[]>`
      SELECT date_trunc('week', r."completedAt") AS week, COUNT(*)::bigint AS count
      FROM "Request" r WHERE r."deletedAt" IS NULL AND r."status" = 'COMPLETED' AND r."completedAt" >= ${since} ${orgSql}
      GROUP BY 1 ORDER BY 1`,
    db.request.groupBy({
      by: ["categoryId"],
      where: { deletedAt: null, status: { not: "DRAFT" }, ...(filter.organizationId ? { organizationId: filter.organizationId } : {}) },
      _count: { _all: true },
    }),
    db.category.findMany({ where: { deletedAt: null } }),
    db.$queryRaw<{ week: Date; volunteers: bigint; hours: number | null }[]>`
      SELECT date_trunc('week', a."completedAt") AS week, COUNT(DISTINCT a."volunteerId")::bigint AS volunteers, SUM(a."hoursSpent")::float AS hours
      FROM "RequestAssignment" a JOIN "Request" r ON r.id = a."requestId"
      WHERE a."status" = 'COMPLETED' AND a."completedAt" >= ${since} ${orgSql}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ city: string | null; requests: bigint; completed: bigint }[]>`
      SELECT l."city" AS city, COUNT(*)::bigint AS requests, COUNT(*) FILTER (WHERE r."status" = 'COMPLETED')::bigint AS completed
      FROM "Request" r LEFT JOIN "Location" l ON l.id = r."locationId"
      WHERE r."deletedAt" IS NULL AND r."status" <> 'DRAFT' ${orgSql}
      GROUP BY l."city" ORDER BY requests DESC LIMIT 10`,
    db.request.groupBy({
      by: ["urgency"],
      where: { deletedAt: null, status: { not: "DRAFT" }, ...(filter.organizationId ? { organizationId: filter.organizationId } : {}) },
      _count: { _all: true },
    }),
  ]);

  // Build a continuous week axis so charts never have gaps.
  const weekKeys: string[] = [];
  const start = new Date(since);
  const day = (start.getUTCDay() + 6) % 7; // Monday-based weeks like date_trunc('week')
  start.setUTCDate(start.getUTCDate() - day);
  start.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i <= weeks; i++) {
    const d = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    weekKeys.push(d.toISOString().slice(0, 10));
  }
  const key = (d: Date) => new Date(d).toISOString().slice(0, 10);
  const createdMap = new Map(created.map((r) => [key(r.week), Number(r.count)]));
  const completedMap = new Map(completed.map((r) => [key(r.week), Number(r.count)]));
  const activityMap = new Map(activity.map((r) => [key(r.week), r]));
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return {
    overTime: weekKeys.map((w) => ({ week: w, created: createdMap.get(w) ?? 0, completed: completedMap.get(w) ?? 0 })),
    categories: cats
      .map((c) => {
        const cat = catMap.get(c.categoryId);
        return {
          slug: cat?.slug ?? "other",
          nameUz: cat?.nameUz ?? "",
          nameRu: cat?.nameRu ?? "",
          nameEn: cat?.nameEn ?? "",
          color: cat?.color ?? "#64748b",
          count: c._count._all,
        };
      })
      .sort((a, b) => b.count - a.count),
    volunteerActivity: weekKeys.map((w) => {
      const r = activityMap.get(w);
      return { week: w, volunteers: r ? Number(r.volunteers) : 0, hours: r ? Math.round(r.hours ?? 0) : 0 };
    }),
    geography: geo.map((g) => ({ city: g.city ?? "—", requests: Number(g.requests), completed: Number(g.completed) })),
    urgency: urgency.map((u) => ({ urgency: u.urgency, count: u._count._all })),
  };
}

export async function getLeaderboard(limit = 10) {
  const rows = await db.volunteerProfile.findMany({
    where: { deletedAt: null, user: { status: "ACTIVE", deletedAt: null, role: "VOLUNTEER" } },
    orderBy: [{ xp: "desc" }, { completedCount: "desc" }],
    take: limit,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: r.user.name,
    avatarUrl: r.user.avatarUrl,
    xp: r.xp,
    completedCount: r.completedCount,
    hoursTotal: Math.round(r.hoursTotal),
    ratingAvg: r.ratingAvg,
  }));
}

/**
 * Cached platform-wide numbers for public pages. These run a dozen aggregate queries, so we
 * reuse the result for 60s instead of hitting the database on every visit.
 */
export const getPublicImpactStats = unstable_cache(() => getImpactStats(), ["public-impact-stats"], { revalidate: 60 });
export const getPublicChartData = unstable_cache((weeks: number) => getChartData(weeks), ["public-chart-data"], { revalidate: 300 });
export const getPublicLeaderboard = unstable_cache((limit: number) => getLeaderboard(limit), ["public-leaderboard"], { revalidate: 60 });
