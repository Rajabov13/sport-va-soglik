import { describe, expect, it } from "vitest";
import { canTransition, TRANSITIONS } from "@/server/domain/request-status";
import { achievementProgress, completionXp, impactPoints, levelForXp, levelProgress, qualifiedAchievements, reviewXp } from "@/server/domain/gamification";
import { moderateRequest } from "@/server/domain/moderation";
import { classifyRequest } from "@/server/domain/classifier";

describe("request state machine", () => {
  it("allows the happy path", () => {
    const path = ["DRAFT", "PENDING", "VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"] as const;
    for (let i = 0; i < path.length - 1; i++) expect(canTransition(path[i], path[i + 1])).toBe(true);
  });

  it("forbids skipping steps and leaving terminal states", () => {
    expect(canTransition("DRAFT", "COMPLETED")).toBe(false);
    expect(canTransition("MATCHING", "IN_PROGRESS")).toBe(false);
    expect(canTransition("COMPLETED", "MATCHING")).toBe(false);
    expect(TRANSITIONS.CANCELLED).toHaveLength(0);
    expect(TRANSITIONS.REJECTED).toHaveLength(0);
  });

  it("supports volunteer withdrawal back to matching", () => {
    expect(canTransition("ACCEPTED", "MATCHING")).toBe(true);
    expect(canTransition("IN_PROGRESS", "MATCHING")).toBe(true);
  });
});

describe("gamification", () => {
  const base = { completedCount: 0, cancelledCount: 0, peopleHelped: 0, hoursTotal: 0, fastResponses: 0, ratingAvg: 0, ratingCount: 0 };

  it("computes XP and impact", () => {
    expect(completionXp("CRITICAL", 2)).toBe(50 + 40 + 10);
    expect(completionXp("LOW", 100)).toBe(50 + 0 + 40);
    expect(reviewXp(5)).toBe(10);
    expect(reviewXp(3)).toBe(0);
    expect(impactPoints(3, 2)).toBe(40);
  });

  it("levels follow a quadratic curve", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(200)).toBe(3);
    const p = levelProgress(125);
    expect(p.level).toBe(2);
    expect(p.percent).toBeGreaterThan(0);
    expect(p.percent).toBeLessThan(100);
  });

  it("unlocks achievements by thresholds", () => {
    expect(qualifiedAchievements(base)).toEqual([]);
    expect(qualifiedAchievements({ ...base, completedCount: 1 })).toEqual(["FIRST_HELP"]);
    const veteran = qualifiedAchievements({ completedCount: 12, cancelledCount: 0, peopleHelped: 60, hoursTotal: 120, fastResponses: 4, ratingAvg: 4.8, ratingCount: 10 });
    expect(veteran).toEqual(expect.arrayContaining(["FIRST_HELP", "TEN_HELPS", "COMMUNITY_HERO", "FAST_RESPONDER", "RELIABLE_VOLUNTEER", "HUNDRED_HOURS"]));
    expect(qualifiedAchievements({ ...base, completedCount: 6, cancelledCount: 3, ratingAvg: 5, ratingCount: 5 })).not.toContain("RELIABLE_VOLUNTEER");
    expect(achievementProgress("TEN_HELPS", { ...base, completedCount: 4 })).toEqual({ value: 4, target: 10 });
  });
});

describe("pre-moderation", () => {
  const clean = { title: "Dori kerak", description: "Onaxonga dori olib kelish kerak", recentRequestsByUser: 0, openReportsAgainstUser: 0, duplicateTitle: false };
  it("approves normal requests", () => {
    expect(moderateRequest(clean)).toEqual({ approved: true, flags: [] });
  });
  it("flags suspicious content and behaviour", () => {
    expect(moderateRequest({ ...clean, description: "Kripto orqali tez pul" }).flags).toContain("blockedContent");
    expect(moderateRequest({ ...clean, recentRequestsByUser: 7 }).flags).toContain("tooManyRequests");
    expect(moderateRequest({ ...clean, duplicateTitle: true }).flags).toContain("duplicate");
    expect(moderateRequest({ ...clean, title: "YORDAM KERAK SHOSHILINCH" }).flags).toContain("shouting");
  });
});

describe("keyword classifier", () => {
  it("detects category and urgency in Uzbek, Russian and English", () => {
    expect(classifyRequest("Onamga dorixonadan dori kerak, juda shoshilinch").categorySlug).toBe("medicine");
    expect(classifyRequest("Onamga dorixonadan dori kerak, juda shoshilinch").urgency).toBe("CRITICAL");
    expect(classifyRequest("Нужна помощь с покупкой продуктов для пожилой бабушки").categorySlug).toMatch(/food|elderly/);
    expect(classifyRequest("Need a tutor for school homework").categorySlug).toBe("education");
    expect(classifyRequest("Hello world").categorySlug).toBe("other");
  });
});
