import type { RequestStatus } from "@prisma/client";

/** Allowed request lifecycle transitions (server-enforced state machine). */
export const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["VERIFIED", "REJECTED", "CANCELLED"],
  VERIFIED: ["MATCHING", "REJECTED", "CANCELLED"],
  MATCHING: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "MATCHING", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "MATCHING", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus) {
  return TRANSITIONS[from].includes(to);
}

export const OPEN_STATUSES: RequestStatus[] = ["VERIFIED", "MATCHING"];
export const ACTIVE_STATUSES: RequestStatus[] = ["ACCEPTED", "IN_PROGRESS"];
export const TERMINAL_STATUSES: RequestStatus[] = ["COMPLETED", "CANCELLED", "REJECTED"];

/** Ordered steps shown in the request timeline. */
export const TIMELINE: RequestStatus[] = ["PENDING", "VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];
