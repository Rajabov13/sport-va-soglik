import { NextResponse } from "next/server";
import { publicRoute, parseJson } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { loginSchema } from "@/schemas/auth";
import { authenticate } from "@/server/services/users";
import { withSession } from "@/server/auth/respond";
import { homeForRole } from "@/server/auth/redirects";
import { LOCALE_COOKIE } from "@/server/auth/constants";

export const POST = publicRoute(
  async ({ req }) => {
    const input = await parseJson(req, loginSchema);
    const user = await authenticate(input);
    const res = NextResponse.json({ data: { id: user.id, role: user.role, redirectTo: homeForRole(user.role) } });
    res.cookies.set(LOCALE_COOKIE, user.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return withSession(req, user.id, res);
  },
  { rateLimit: RATE_LIMITS.auth },
);
