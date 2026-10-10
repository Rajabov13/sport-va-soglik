import type { Prisma } from "@prisma/client";
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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week containing `d` (ISO date string key). */
function weekKey(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

/** Chart series aggregated in application code (portable across databases; datasets are small and bounded by the period). */
export async function getChartData(weeks = 12, filter: { organizationId?: string } = {}): Promise<ChartData> {
  const since = new Date(Date.now() - weeks * WEEK_MS);
  const orgWhere: Prisma.RequestWhereInput = filter.organizationId ? { organizationId: filter.organizationId } : {};
  const base: Prisma.RequestWhereInput = { deletedAt: null, status: { not: "DRAFT" }, ...orgWhere };

  const [recent, completedRecent, cats, categories, activity, geo, urgency, locations] = await Promise.all([
    db.request.findMany({ where: { ...base, createdAt: { gte: since } }, select: { createdAt: true } }),
    db.request.findMany({ where: { ...base, status: "COMPLETED", completedAt: { gte: since } }, select: { completedAt: true } }),
    db.request.groupBy({ by: ["categoryId"], where: base, _count: { _all: true } }),
    db.category.findMany({ where: { deletedAt: null } }),
    db.requestAssignment.findMany({
      where: { status: "COMPLETED", completedAt: { gte: since }, request: orgWhere },
      select: { completedAt: true, volunteerId: true, hoursSpent: true },
    }),
    db.request.groupBy({ by: ["locationId", "status"], where: base, _count: { _all: true } }),
    db.request.groupBy({ by: ["urgency"], where: base, _count: { _all: true } }),
    db.location.findMany({ select: { id: true, city: true } }),
  ]);

  // Continuous week axis so charts never have gaps.
  const weekKeys: string[] = [];
  const first = new Date(weekKey(since));
  for (let i = 0; i <= weeks; i++) weekKeys.push(new Date(first.getTime() + i * WEEK_MS).toISOString().slice(0, 10));

  const count = (dates: (Date | null)[]) => {
    const m = new Map<string, number>();
    for (const d of dates) if (d) m.set(weekKey(d), (m.get(weekKey(d)) ?? 0) + 1);
    return m;
  };
  const createdMap = count(recent.map((r) => r.createdAt));
  const completedMap = count(completedRecent.map((r) => r.completedAt));

  const activityMap = new Map<string, { volunteers: Set<string>; hours: number }>();
  for (const a of activity) {
    if (!a.completedAt) continue;
    const k = weekKey(a.completedAt);
    const e = activityMap.get(k) ?? { volunteers: new Set<string>(), hours: 0 };
    e.volunteers.add(a.volunteerId);
    e.hours += a.hoursSpent ?? 0;
    activityMap.set(k, e);
  }

  const cityById = new Map(locations.map((l) => [l.id, l.city]));
  const geoMap = new Map<string, { requests: number; completed: number }>();
  for (const g of geo) {
    const city = (g.locationId && cityById.get(g.locationId)) || "—";
    const e = geoMap.get(city) ?? { requests: 0, completed: 0 };
    e.requests += g._count._all;
    if (g.status === "COMPLETED") e.completed += g._count._all;
    geoMap.set(city, e);
  }

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
      return { week: w, volunteers: r ? r.volunteers.size : 0, hours: r ? Math.round(r.hours) : 0 };
    }),
    geography: [...geoMap.entries()]
      .map(([city, v]) => ({ city, ...v }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10),
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
