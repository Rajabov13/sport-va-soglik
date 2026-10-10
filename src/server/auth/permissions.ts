import type { Role, RequestStatus } from "@prisma/client";

/**
 * Role-based access control. Every check here runs on the server — the client
 * role is never trusted. Resource-level checks (ownership) are explicit helpers.
 */
export type Permission =
  | "request:create"
  | "request:browse"
  | "request:accept"
  | "volunteer:profile"
  | "organization:manage"
  | "campaign:create"
  | "campaign:join"
  | "admin:access"
  | "admin:moderate"
  | "admin:users"
  | "report:create"
  | "review:create";

const MATRIX: Record<Permission, Role[]> = {
  "request:create": ["USER", "ORGANIZATION", "ADMIN"],
  "request:browse": ["VOLUNTEER", "ORGANIZATION", "ADMIN"],
  "request:accept": ["VOLUNTEER"],
  "volunteer:profile": ["VOLUNTEER"],
  "organization:manage": ["ORGANIZATION", "ADMIN"],
  "campaign:create": ["ORGANIZATION"],
  "campaign:join": ["VOLUNTEER"],
  "admin:access": ["ADMIN"],
  "admin:moderate": ["ADMIN"],
  "admin:users": ["ADMIN"],
  "report:create": ["USER", "VOLUNTEER", "ORGANIZATION", "ADMIN"],
  "review:create": ["USER", "ORGANIZATION", "VOLUNTEER"],
};

export function hasPermission(role: Role, permission: Permission) {
  return MATRIX[permission].includes(role);
}

interface Actor {
  id: string;
  role: Role;
}

interface RequestLike {
  requesterId: string;
  status: RequestStatus;
  assignments?: { volunteerId: string; status: string }[];
}

export function isRequestOwner(actor: Actor, request: RequestLike) {
  return request.requesterId === actor.id;
}

export function isAssignedVolunteer(actor: Actor, request: RequestLike) {
  return (
    request.assignments?.some((a) => a.volunteerId === actor.id && a.status !== "CANCELLED") ?? false
  );
}

const EDITABLE_STATUSES: RequestStatus[] = ["DRAFT", "PENDING", "VERIFIED", "MATCHING"];
const PUBLIC_STATUSES: RequestStatus[] = ["VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];

export function canEditRequest(actor: Actor, request: RequestLike) {
  if (actor.role === "ADMIN") return true;
  return isRequestOwner(actor, request) && EDITABLE_STATUSES.includes(request.status);
}

export function canCancelRequest(actor: Actor, request: RequestLike) {
  if (actor.role === "ADMIN") return !["COMPLETED", "CANCELLED", "REJECTED"].includes(request.status);
  return (
    isRequestOwner(actor, request) &&
    ["DRAFT", "PENDING", "VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS"].includes(request.status)
  );
}

/** Who may see the full request (including private contact details). */
export function canViewRequestPrivate(actor: Actor, request: RequestLike) {
  return actor.role === "ADMIN" || isRequestOwner(actor, request) || isAssignedVolunteer(actor, request);
}

/** Who may see the request card at all. */
export function canViewRequest(actor: Actor | null, request: RequestLike) {
  if (PUBLIC_STATUSES.includes(request.status)) return true;
  if (!actor) return false;
  return canViewRequestPrivate(actor, request);
}

/** Match lists reveal volunteer names and scores: only the requester and admins may see them. */
export function canSeeMatches(actor: Actor, request: RequestLike) {
  return actor.role === "ADMIN" || isRequestOwner(actor, request);
}
