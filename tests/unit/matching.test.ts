import { describe, expect, it } from "vitest";
import {
  availabilityScore,
  experienceScore,
  locationScore,
  matchQuality,
  rankVolunteers,
  reputationScore,
  ruleBasedStrategy,
  skillScore,
  urgencyScore,
  WEIGHTS,
} from "@/server/services/matching/rule-based";
import type { MatchRequestInput, MatchVolunteerInput } from "@/server/services/matching/types";

const request: MatchRequestInput = {
  id: "r1",
  categoryId: "medicine",
  relatedSkills: ["driving", "first-aid", "medical"],
  urgency: "HIGH",
  latitude: 41.2995,
  longitude: 69.2401,
  preferredDate: null,
};

function volunteer(overrides: Partial<MatchVolunteerInput> = {}): MatchVolunteerInput {
  return {
    userId: "v1",
    latitude: 41.3,
    longitude: 69.24,
    radiusKm: 10,
    skills: ["driving", "medical"],
    categoryIds: ["medicine"],
    isAvailableNow: true,
    availability: [],
    completedCount: 10,
    cancelledCount: 0,
    ratingAvg: 4.9,
    ratingCount: 10,
    avgResponseMinutes: 10,
    ...overrides,
  };
}

describe("rule-based matching", () => {
  it("weights add up to 100", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("gives a near-perfect score to an ideal nearby volunteer", () => {
    const r = ruleBasedStrategy.score(request, volunteer(), new Date());
    expect(r).not.toBeNull();
    expect(r!.score).toBeGreaterThanOrEqual(85);
    expect(r!.breakdown.distanceKm).toBeLessThan(1);
  });

  it("excludes volunteers far outside their radius (hard constraint)", () => {
    // Samarkand is ~260 km from Tashkent.
    expect(ruleBasedStrategy.score(request, volunteer({ latitude: 39.65, longitude: 66.96 }), new Date())).toBeNull();
    expect(locationScore(100, 10)).toBeNull();
  });

  it("location score decays with distance", () => {
    expect(locationScore(0, 10)).toBe(WEIGHTS.location);
    expect(locationScore(5, 10)!).toBeLessThan(WEIGHTS.location);
    expect(locationScore(15, 10)!).toBeLessThan(locationScore(9, 10)!);
  });

  it("rewards matching category and skills", () => {
    const strong = skillScore(request, volunteer());
    const weak = skillScore(request, volunteer({ categoryIds: ["education"], skills: ["math"] }));
    expect(strong).toBe(WEIGHTS.skill);
    expect(weak).toBe(0);
  });

  it("availability honours weekly slots for a preferred date", () => {
    const monday10 = new Date(2026, 9, 12, 10, 0); // Monday
    const slots = [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 12 * 60 }];
    expect(availabilityScore(volunteer({ availability: slots, isAvailableNow: false }), monday10, new Date())).toBe(WEIGHTS.availability);
    expect(availabilityScore(volunteer({ availability: [{ dayOfWeek: 1, startMinute: 14 * 60, endMinute: 16 * 60 }], isAvailableNow: false }), monday10, new Date())).toBe(10);
    expect(availabilityScore(volunteer({ availability: [], isAvailableNow: false }), monday10, new Date())).toBe(0);
  });

  it("urgent requests prefer fast responders", () => {
    const critical = { ...request, urgency: "CRITICAL" as const };
    const fast = urgencyScore(critical, volunteer({ avgResponseMinutes: 5 }));
    const slow = urgencyScore(critical, volunteer({ avgResponseMinutes: 200, isAvailableNow: false }));
    expect(fast).toBeGreaterThan(slow);
    // Low urgency does not penalise slow responders.
    expect(urgencyScore({ ...request, urgency: "LOW" }, volunteer({ avgResponseMinutes: 200 }))).toBe(WEIGHTS.urgency);
  });

  it("experience and reputation are bounded", () => {
    expect(experienceScore(0)).toBe(0);
    expect(experienceScore(1000)).toBe(WEIGHTS.experience);
    expect(reputationScore(volunteer({ ratingCount: 0, ratingAvg: 0 }))).toBeGreaterThan(0);
    expect(reputationScore(volunteer({ completedCount: 1, cancelledCount: 9 }))).toBeLessThan(reputationScore(volunteer()));
  });

  it("ranks volunteers by score and limits results", () => {
    const vols = [
      volunteer({ userId: "far", latitude: 41.38, longitude: 69.33 }),
      volunteer({ userId: "best" }),
      volunteer({ userId: "wrong-skills", categoryIds: [], skills: [] }),
      volunteer({ userId: "excluded", latitude: 39.65, longitude: 66.96 }),
    ];
    const ranked = rankVolunteers(request, vols, ruleBasedStrategy, new Date(), 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].volunteerId).toBe("best");
    expect(ranked.map((r) => r.volunteerId)).not.toContain("excluded");
  });

  it("labels match quality", () => {
    expect(matchQuality(92)).toBe("excellent");
    expect(matchQuality(75)).toBe("good");
    expect(matchQuality(55)).toBe("fair");
    expect(matchQuality(20)).toBe("low");
  });
});
