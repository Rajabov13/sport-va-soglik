import type { Urgency } from "@prisma/client";

export interface AvailabilitySlot {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface MatchRequestInput {
  id: string;
  categoryId: string;
  relatedSkills: string[];
  urgency: Urgency;
  latitude: number;
  longitude: number;
  preferredDate: Date | null;
}

export interface MatchVolunteerInput {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  skills: string[];
  categoryIds: string[];
  isAvailableNow: boolean;
  availability: AvailabilitySlot[];
  completedCount: number;
  cancelledCount: number;
  ratingAvg: number;
  ratingCount: number;
  avgResponseMinutes: number | null;
}

export interface MatchBreakdown {
  location: number;
  skill: number;
  availability: number;
  urgency: number;
  experience: number;
  reputation: number;
  distanceKm: number;
}

export interface MatchResult {
  volunteerId: string;
  score: number;
  breakdown: MatchBreakdown;
}

/**
 * A matching strategy scores a single volunteer for a request.
 * Returning `null` excludes the volunteer (hard constraint).
 * The rule-based strategy can be replaced by an ML model implementing the same interface.
 */
export interface MatchingStrategy {
  readonly name: string;
  score(request: MatchRequestInput, volunteer: MatchVolunteerInput, now: Date): MatchResult | null;
}
