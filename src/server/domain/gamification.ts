import type { Urgency } from "@prisma/client";

export const ACHIEVEMENTS = [
  { code: "FIRST_HELP", icon: "HeartHandshake", xpReward: 20, threshold: 1, sortOrder: 1 },
  { code: "TEN_HELPS", icon: "Medal", xpReward: 100, threshold: 10, sortOrder: 2 },
  { code: "COMMUNITY_HERO", icon: "Crown", xpReward: 250, threshold: 50, sortOrder: 3 },
  { code: "FAST_RESPONDER", icon: "Zap", xpReward: 60, threshold: 3, sortOrder: 4 },
  { code: "RELIABLE_VOLUNTEER", icon: "ShieldCheck", xpReward: 120, threshold: 5, sortOrder: 5 },
  { code: "HUNDRED_HOURS", icon: "Clock", xpReward: 300, threshold: 100, sortOrder: 6 },
] as const;

export type AchievementCode = (typeof ACHIEVEMENTS)[number]["code"];

export interface VolunteerStats {
  completedCount: number;
  cancelledCount: number;
  peopleHelped: number;
  hoursTotal: number;
  fastResponses: number;
  ratingAvg: number;
  ratingCount: number;
}

/** Minutes within which an acceptance counts as a "fast response". */
export const FAST_RESPONSE_MINUTES = 15;

const URGENCY_XP: Record<Urgency, number> = { LOW: 0, MEDIUM: 10, HIGH: 20, CRITICAL: 40 };

export function completionXp(urgency: Urgency, hours: number) {
  return 50 + URGENCY_XP[urgency] + Math.min(40, Math.round(hours * 5));
}

export function reviewXp(rating: number) {
  return rating === 5 ? 10 : rating === 4 ? 5 : 0;
}

export function impactPoints(peopleCount: number, hours: number) {
  return peopleCount * 10 + Math.round(hours * 5);
}

/** Level curve: level n requires 50·(n-1)² XP. */
export function levelForXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

export function xpForLevel(level: number) {
  return 50 * (level - 1) ** 2;
}

export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return { level, current: xp - floor, needed: ceil - floor, percent: Math.round(((xp - floor) / (ceil - floor)) * 100) };
}

/** Returns every achievement code the stats qualify for (callers diff against already-unlocked ones). */
export function qualifiedAchievements(s: VolunteerStats): AchievementCode[] {
  const out: AchievementCode[] = [];
  if (s.completedCount >= 1) out.push("FIRST_HELP");
  if (s.completedCount >= 10) out.push("TEN_HELPS");
  if (s.peopleHelped >= 50) out.push("COMMUNITY_HERO");
  if (s.fastResponses >= 3) out.push("FAST_RESPONDER");
  const closed = s.completedCount + s.cancelledCount;
  if (s.completedCount >= 5 && s.ratingCount >= 3 && s.ratingAvg >= 4.5 && s.cancelledCount / closed <= 0.1) {
    out.push("RELIABLE_VOLUNTEER");
  }
  if (s.hoursTotal >= 100) out.push("HUNDRED_HOURS");
  return out;
}

export function achievementProgress(code: AchievementCode, s: VolunteerStats) {
  switch (code) {
    case "FIRST_HELP":
      return { value: Math.min(s.completedCount, 1), target: 1 };
    case "TEN_HELPS":
      return { value: Math.min(s.completedCount, 10), target: 10 };
    case "COMMUNITY_HERO":
      return { value: Math.min(s.peopleHelped, 50), target: 50 };
    case "FAST_RESPONDER":
      return { value: Math.min(s.fastResponses, 3), target: 3 };
    case "RELIABLE_VOLUNTEER":
      return { value: Math.min(s.completedCount, 5), target: 5 };
    case "HUNDRED_HOURS":
      return { value: Math.min(Math.floor(s.hoursTotal), 100), target: 100 };
  }
}
