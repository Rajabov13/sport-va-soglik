import type { Role } from "@prisma/client";

export function homeForRole(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "VOLUNTEER":
      return "/dashboard/volunteer";
    case "ORGANIZATION":
      return "/dashboard/organization";
    default:
      return "/dashboard";
  }
}

/** Only allow same-site relative redirects (prevents open redirect). */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
