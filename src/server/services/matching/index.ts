import { db } from "@/server/db";
import { notify } from "@/server/services/notifications";
import { rankVolunteers, ruleBasedStrategy } from "./rule-based";
import type { MatchingStrategy, MatchVolunteerInput } from "./types";

export { matchQuality, WEIGHTS } from "./rule-based";
export type { MatchBreakdown, MatchResult } from "./types";

/** Swap this for an ML-backed strategy without touching callers. */
let activeStrategy: MatchingStrategy = ruleBasedStrategy;
export function setMatchingStrategy(strategy: MatchingStrategy) {
  activeStrategy = strategy;
}

const NOTIFY_TOP = 5;

async function loadCandidates(excludeUserIds: string[]): Promise<MatchVolunteerInput[]> {
  const profiles = await db.volunteerProfile.findMany({
    where: {
      deletedAt: null,
      latitude: { not: null },
      longitude: { not: null },
      user: { role: "VOLUNTEER", status: "ACTIVE", deletedAt: null, id: { notIn: excludeUserIds } },
    },
    include: { categories: { select: { categoryId: true } }, availability: true },
    take: 2000,
  });
  return profiles.map((p) => ({
    userId: p.userId,
    latitude: p.latitude!,
    longitude: p.longitude!,
    radiusKm: p.radiusKm,
    skills: p.skills,
    categoryIds: p.categories.map((c) => c.categoryId),
    isAvailableNow: p.isAvailableNow,
    availability: p.availability.map((a) => ({ dayOfWeek: a.dayOfWeek, startMinute: a.startMinute, endMinute: a.endMinute })),
    completedCount: p.completedCount,
    cancelledCount: p.cancelledCount,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    avgResponseMinutes: p.avgResponseMinutes,
  }));
}

/**
 * Compute and persist matches for a request, then notify the best volunteers.
 * Volunteers who declined or withdrew keep their match row (with declinedAt) and are excluded.
 */
export async function computeMatches(requestId: string, opts: { notify?: boolean } = {}) {
  const request = await db.request.findUnique({
    where: { id: requestId },
    include: { category: true, matches: { where: { declinedAt: { not: null } }, select: { volunteerId: true } } },
  });
  if (!request) return [];

  const excluded = [request.requesterId, ...request.matches.map((m) => m.volunteerId)];
  const candidates = await loadCandidates(excluded);
  const results = rankVolunteers(
    {
      id: request.id,
      categoryId: request.categoryId,
      relatedSkills: request.category.relatedSkills,
      urgency: request.urgency,
      latitude: request.latitude,
      longitude: request.longitude,
      preferredDate: request.preferredDate,
    },
    candidates,
    activeStrategy,
  );

  const existing = await db.requestMatch.findMany({ where: { requestId, declinedAt: null }, select: { volunteerId: true, notifiedAt: true } });
  const alreadyNotified = new Set(existing.filter((e) => e.notifiedAt).map((e) => e.volunteerId));

  await db.$transaction([
    db.requestMatch.deleteMany({ where: { requestId, declinedAt: null } }),
    ...results.map((r, i) =>
      db.requestMatch.create({
        data: {
          requestId,
          volunteerId: r.volunteerId,
          score: r.score,
          breakdown: r.breakdown as unknown as object,
          rank: i + 1,
          algorithm: activeStrategy.name,
          notifiedAt: alreadyNotified.has(r.volunteerId) || (opts.notify !== false && i < NOTIFY_TOP) ? new Date() : null,
        },
      }),
    ),
  ]);

  if (opts.notify !== false) {
    const toNotify = results.slice(0, NOTIFY_TOP).filter((r) => !alreadyNotified.has(r.volunteerId));
    await Promise.all(
      toNotify.map((r) =>
        notify(r.volunteerId, "NEW_MATCH", { title: request.title, score: r.score }, `/dashboard/requests/${request.id}`),
      ),
    );
  }
  return results;
}
