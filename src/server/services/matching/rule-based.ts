import { distanceKm } from "@/lib/geo";
import { clamp } from "@/lib/utils";
import type { MatchingStrategy, MatchRequestInput, MatchVolunteerInput, MatchResult, AvailabilitySlot } from "./types";

/**
 * Transparent rule-based matching (no machine learning).
 *
 * matchScore = location (30) + skill (25) + availability (15)
 *            + urgency (10) + experience (10) + reputation (10)  → 0…100
 */
export const WEIGHTS = {
  location: 30,
  skill: 25,
  availability: 15,
  urgency: 10,
  experience: 10,
  reputation: 10,
} as const;

/** Volunteers further than `radiusKm * HARD_RADIUS_FACTOR + HARD_RADIUS_SLACK_KM` are excluded. */
const HARD_RADIUS_FACTOR = 2;
const HARD_RADIUS_SLACK_KM = 5;

const URGENCY_SPEED_NEED = { LOW: 0, MEDIUM: 0.33, HIGH: 0.66, CRITICAL: 1 } as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function locationScore(distance: number, radiusKm: number): number | null {
  const radius = Math.max(1, radiusKm);
  const hardLimit = radius * HARD_RADIUS_FACTOR + HARD_RADIUS_SLACK_KM;
  if (distance > hardLimit) return null;
  if (distance <= radius) return WEIGHTS.location * (1 - 0.5 * (distance / radius));
  // Linearly fade from half weight to zero between the radius and the hard limit.
  const t = (distance - radius) / (hardLimit - radius);
  return (WEIGHTS.location / 2) * (1 - t);
}

export function skillScore(request: MatchRequestInput, volunteer: MatchVolunteerInput) {
  const categoryMatch = volunteer.categoryIds.includes(request.categoryId) ? 15 : 0;
  const wanted = new Set(request.relatedSkills.map((s) => s.toLowerCase()));
  const overlap = volunteer.skills.filter((s) => wanted.has(s.toLowerCase())).length;
  const skillPart = wanted.size === 0 ? 5 : 10 * Math.min(1, overlap / 2);
  return categoryMatch + skillPart;
}

function slotCovers(slot: AvailabilitySlot, day: number, minute: number) {
  return slot.dayOfWeek === day && slot.startMinute <= minute && slot.endMinute > minute;
}

export function availabilityScore(volunteer: MatchVolunteerInput, preferredDate: Date | null, now: Date) {
  const slots = volunteer.availability;
  if (preferredDate) {
    const day = preferredDate.getDay();
    const minute = preferredDate.getHours() * 60 + preferredDate.getMinutes();
    if (slots.some((s) => slotCovers(s, day, minute))) return WEIGHTS.availability;
    if (slots.some((s) => s.dayOfWeek === day)) return 10;
    return volunteer.isAvailableNow ? 5 : 0;
  }
  if (volunteer.isAvailableNow) return WEIGHTS.availability;
  const today = now.getDay();
  const tomorrow = (today + 1) % 7;
  if (slots.some((s) => s.dayOfWeek === today || s.dayOfWeek === tomorrow)) return 10;
  return slots.length > 0 ? 5 : 0;
}

/** Urgent requests reward volunteers who historically respond fast and are available now. */
export function urgencyScore(request: MatchRequestInput, volunteer: MatchVolunteerInput) {
  const need = URGENCY_SPEED_NEED[request.urgency];
  const responsiveness =
    volunteer.avgResponseMinutes === null ? 0.5 : clamp(1 - volunteer.avgResponseMinutes / 120, 0, 1);
  const readiness = volunteer.isAvailableNow ? 1 : 0.5;
  const speed = (responsiveness + readiness) / 2;
  return WEIGHTS.urgency * (1 - need + need * speed);
}

export function experienceScore(completed: number) {
  return WEIGHTS.experience * Math.min(1, Math.log(1 + completed) / Math.log(1 + 50));
}

/** Bayesian-smoothed rating (prior of 4★ weighted as 3 reviews) multiplied by reliability. */
export function reputationScore(volunteer: MatchVolunteerInput) {
  const prior = 4;
  const priorWeight = 3;
  const smoothed =
    (volunteer.ratingAvg * volunteer.ratingCount + prior * priorWeight) / (volunteer.ratingCount + priorWeight);
  const ratingPart = clamp((smoothed - 1) / 4, 0, 1);
  const closed = volunteer.completedCount + volunteer.cancelledCount;
  const reliability = closed === 0 ? 1 : volunteer.completedCount / closed;
  return WEIGHTS.reputation * ratingPart * (0.5 + 0.5 * reliability);
}

export const ruleBasedStrategy: MatchingStrategy = {
  name: "rule-based-v1",
  score(request: MatchRequestInput, volunteer: MatchVolunteerInput, now: Date): MatchResult | null {
    const distance = distanceKm(
      { lat: request.latitude, lng: request.longitude },
      { lat: volunteer.latitude, lng: volunteer.longitude },
    );
    const location = locationScore(distance, volunteer.radiusKm);
    if (location === null) return null;

    const breakdown = {
      location: round1(location),
      skill: round1(skillScore(request, volunteer)),
      availability: round1(availabilityScore(volunteer, request.preferredDate, now)),
      urgency: round1(urgencyScore(request, volunteer)),
      experience: round1(experienceScore(volunteer.completedCount)),
      reputation: round1(reputationScore(volunteer)),
      distanceKm: round1(distance),
    };
    const total =
      breakdown.location +
      breakdown.skill +
      breakdown.availability +
      breakdown.urgency +
      breakdown.experience +
      breakdown.reputation;
    return { volunteerId: volunteer.userId, score: clamp(Math.round(total), 0, 100), breakdown };
  },
};

export function rankVolunteers(
  request: MatchRequestInput,
  volunteers: MatchVolunteerInput[],
  strategy: MatchingStrategy = ruleBasedStrategy,
  now = new Date(),
  limit = 10,
): MatchResult[] {
  return volunteers
    .map((v) => strategy.score(request, v, now))
    .filter((r): r is MatchResult => r !== null && r.score > 0)
    .sort((a, b) => b.score - a.score || a.breakdown.distanceKm - b.breakdown.distanceKm)
    .slice(0, limit);
}

export function matchQuality(score: number): "excellent" | "good" | "fair" | "low" {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "low";
}
