import { NextResponse } from "next/server";
import { publicRoute, parseJson } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { registerSchema } from "@/schemas/auth";
import { registerUser } from "@/server/services/users";
import { withSession } from "@/server/auth/respond";
import { homeForRole } from "@/server/auth/redirects";
import { isLocale } from "@/i18n/config";
import { LOCALE_COOKIE } from "@/server/auth/constants";

export const POST = publicRoute(
  async ({ req }) => {
    const input = await parseJson(req, registerSchema);
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
    const user = await registerUser(input, isLocale(cookieLocale) ? cookieLocale : "uz");
    const res = NextResponse.json({ data: { id: user.id, role: user.role, redirectTo: homeForRole(user.role) } }, { status: 201 });
    return withSession(req, user.id, res);
  },
  { rateLimit: RATE_LIMITS.register },
);
