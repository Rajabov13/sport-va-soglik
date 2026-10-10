import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getUserBySessionToken } from "./session";
import { SESSION_COOKIE } from "./constants";

/** Current user for Server Components / layouts, memoised per request. */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  return getUserBySessionToken(store.get(SESSION_COOKIE)?.value);
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireRole(roles: Role[], next?: string) {
  const user = await requireUser(next);
  if (!roles.includes(user.role)) redirect("/forbidden");
  return user;
}
