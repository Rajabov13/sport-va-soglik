import type { SessionUser } from "./session";
import type { ClientUser } from "@/components/shared/session";

/** Minimal user projection safe to serialise into client components. */
export function toClientUser(user: SessionUser | null): ClientUser | null {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, isDemo: user.isDemo };
}
