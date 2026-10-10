import type { Urgency } from "@prisma/client";
import { db, type Tx } from "@/server/db";
import { completionXp, impactPoints, qualifiedAchievements, reviewXp, FAST_RESPONSE_MINUTES, ACHIEVEMENTS } from "@/server/domain/gamification";
import { notify } from "./notifications";

export async function ensureAchievementsCatalog(client: Tx | typeof db = db) {
  for (const a of ACHIEVEMENTS) {
    await client.achievement.upsert({
      where: { code: a.code },
      update: { icon: a.icon, xpReward: a.xpReward, threshold: a.threshold, sortOrder: a.sortOrder },
      create: a,
    });
  }
}

/** Unlock any newly qualified achievements; returns the codes unlocked now. */
export async function evaluateAchievements(userId: string) {
  const profile = await db.volunteerProfile.findUnique({ where: { userId } });
  if (!profile) return [];
  const qualified = qualifiedAchievements(profile);
  if (qualified.length === 0) return [];
  const catalog = await db.achievement.findMany({ where: { code: { in: qualified } } });
  const owned = await db.userAchievement.findMany({ where: { userId }, select: { achievementId: true } });
  const ownedIds = new Set(owned.map((o) => o.achievementId));
  const fresh = catalog.filter((a) => !ownedIds.has(a.id));
  for (const a of fresh) {
    await db.$transaction([
      db.userAchievement.create({ data: { userId, achievementId: a.id } }),
      db.volunteerProfile.update({ where: { userId }, data: { xp: { increment: a.xpReward } } }),
    ]);
    await notify(userId, "ACHIEVEMENT_UNLOCKED", { code: a.code, xp: a.xpReward }, "/dashboard/achievements");
  }
  return fresh.map((a) => a.code);
}

export async function recordAcceptance(tx: Tx, volunteerId: string, responseMinutes: number) {
  const profile = await tx.volunteerProfile.findUnique({ where: { userId: volunteerId } });
  if (!profile) return;
  const accepted = profile.completedCount + profile.cancelledCount + 1;
  const prevAvg = profile.avgResponseMinutes ?? responseMinutes;
  const avg = prevAvg + (responseMinutes - prevAvg) / accepted;
  await tx.volunteerProfile.update({
    where: { userId: volunteerId },
    data: {
      avgResponseMinutes: Math.round(avg * 10) / 10,
      ...(responseMinutes <= FAST_RESPONSE_MINUTES ? { fastResponses: { increment: 1 } } : {}),
    },
  });
}

export async function recordCompletion(
  tx: Tx,
  volunteerId: string,
  data: { urgency: Urgency; hours: number; peopleCount: number },
) {
  const xp = completionXp(data.urgency, data.hours);
  await tx.volunteerProfile.update({
    where: { userId: volunteerId },
    data: {
      completedCount: { increment: 1 },
      hoursTotal: { increment: data.hours },
      peopleHelped: { increment: data.peopleCount },
      impactScore: { increment: impactPoints(data.peopleCount, data.hours) },
      xp: { increment: xp },
    },
  });
  return xp;
}

export async function recordCancellation(tx: Tx, volunteerId: string) {
  await tx.volunteerProfile.updateMany({ where: { userId: volunteerId }, data: { cancelledCount: { increment: 1 } } });
}

/** Recalculate the volunteer's rating aggregate after a new review. */
export async function recordReview(tx: Tx, targetId: string, rating: number) {
  const profile = await tx.volunteerProfile.findUnique({ where: { userId: targetId } });
  if (!profile) return;
  const agg = await tx.review.aggregate({ where: { targetId, deletedAt: null }, _avg: { rating: true }, _count: true });
  await tx.volunteerProfile.update({
    where: { userId: targetId },
    data: {
      ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100,
      ratingCount: agg._count,
      xp: { increment: reviewXp(rating) },
    },
  });
}
