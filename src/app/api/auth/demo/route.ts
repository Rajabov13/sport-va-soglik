import { NextResponse } from "next/server";
import { publicRoute, parseJson } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { demoLoginSchema } from "@/schemas/auth";
import { ApiError } from "@/server/http/errors";
import { env } from "@/config/env";
import { db } from "@/server/db";
import { withSession } from "@/server/auth/respond";
import { destroySession } from "@/server/auth/session";
import { homeForRole } from "@/server/auth/redirects";
import { SESSION_COOKIE } from "@/server/auth/constants";
import { DEMO_ACCOUNTS } from "@/config/demo";

/** One-click demo login. Only enabled when DEMO_MODE=true, and only for seeded demo accounts. */
export const POST = publicRoute(
  async ({ req }) => {
    if (!env.demoMode) throw new ApiError(403, "demoDisabled");
    const { persona } = await parseJson(req, demoLoginSchema);
    const user = await db.user.findFirst({ where: { email: DEMO_ACCOUNTS[persona], isDemo: true, deletedAt: null, status: "ACTIVE" } });
    if (!user) throw new ApiError(404, "notFound");
    await destroySession(req.cookies.get(SESSION_COOKIE)?.value);
    const res = NextResponse.json({ data: { id: user.id, role: user.role, redirectTo: homeForRole(user.role) } });
    return withSession(req, user.id, res);
  },
  { rateLimit: RATE_LIMITS.auth },
);
