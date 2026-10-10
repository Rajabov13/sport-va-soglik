import { describe, expect, it } from "vitest";
import { canCancelRequest, canEditRequest, canSeeMatches, canViewRequest, canViewRequestPrivate, hasPermission } from "@/server/auth/permissions";

const owner = { id: "u1", role: "USER" as const };
const other = { id: "u2", role: "USER" as const };
const volunteer = { id: "v1", role: "VOLUNTEER" as const };
const admin = { id: "a1", role: "ADMIN" as const };

const req = (status: Parameters<typeof canEditRequest>[1]["status"], assigned = false) => ({
  requesterId: "u1",
  status,
  assignments: assigned ? [{ volunteerId: "v1", status: "ACTIVE" }] : [],
});

describe("RBAC matrix", () => {
  it("restricts actions by role", () => {
    expect(hasPermission("USER", "request:create")).toBe(true);
    expect(hasPermission("VOLUNTEER", "request:create")).toBe(false);
    expect(hasPermission("VOLUNTEER", "request:accept")).toBe(true);
    expect(hasPermission("USER", "request:accept")).toBe(false);
    expect(hasPermission("USER", "admin:access")).toBe(false);
    expect(hasPermission("ADMIN", "admin:access")).toBe(true);
    expect(hasPermission("ORGANIZATION", "campaign:create")).toBe(true);
    expect(hasPermission("VOLUNTEER", "campaign:create")).toBe(false);
  });
});

describe("resource permissions", () => {
  it("only the owner (or admin) edits, and only before acceptance", () => {
    expect(canEditRequest(owner, req("MATCHING"))).toBe(true);
    expect(canEditRequest(other, req("MATCHING"))).toBe(false);
    expect(canEditRequest(owner, req("COMPLETED"))).toBe(false);
    expect(canEditRequest(admin, req("COMPLETED"))).toBe(true);
  });

  it("cancellation rules", () => {
    expect(canCancelRequest(owner, req("IN_PROGRESS"))).toBe(true);
    expect(canCancelRequest(owner, req("COMPLETED"))).toBe(false);
    expect(canCancelRequest(other, req("MATCHING"))).toBe(false);
  });

  it("private details are only for owner, assigned volunteer and admin", () => {
    expect(canViewRequestPrivate(owner, req("ACCEPTED", true))).toBe(true);
    expect(canViewRequestPrivate(volunteer, req("ACCEPTED", true))).toBe(true);
    expect(canViewRequestPrivate(volunteer, req("ACCEPTED", false))).toBe(false);
    expect(canViewRequestPrivate(other, req("ACCEPTED", true))).toBe(false);
    expect(canViewRequestPrivate(admin, req("ACCEPTED"))).toBe(true);
  });

  it("drafts and pending requests are hidden from the public", () => {
    expect(canViewRequest(null, req("DRAFT"))).toBe(false);
    expect(canViewRequest(other, req("PENDING"))).toBe(false);
    expect(canViewRequest(owner, req("PENDING"))).toBe(true);
    expect(canViewRequest(null, req("MATCHING"))).toBe(true);
  });

  it("match lists are only visible to owner and admin", () => {
    expect(canSeeMatches(owner, req("MATCHING"))).toBe(true);
    expect(canSeeMatches(admin, req("MATCHING"))).toBe(true);
    expect(canSeeMatches(volunteer, req("MATCHING"))).toBe(false);
    expect(canSeeMatches({ id: "o1", role: "ORGANIZATION" }, req("MATCHING"))).toBe(false);
  });
});
