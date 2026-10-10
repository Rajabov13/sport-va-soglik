import { NextResponse, type NextRequest } from "next/server";
import { exchangeGoogleCode, googleConfigured } from "@/server/auth/google";
import { unsign } from "@/server/auth/tokens";
import { LOCALE_COOKIE, OAUTH_STATE_COOKIE } from "@/server/auth/constants";
import { upsertGoogleUser } from "@/server/services/users";
import { withSession } from "@/server/auth/respond";
import { homeForRole, safeNext } from "@/server/auth/redirects";
import { isLocale } from "@/i18n/config";
import { env } from "@/config/env";

export async function GET(req: NextRequest) {
  const fail = (code: string) => NextResponse.redirect(new URL(`/auth/login?error=${code}`, env.appUrl));
  if (!googleConfigured()) return fail("oauthNotConfigured");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stored = unsign(req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "");
  if (!code || !state || !stored) return fail("oauthFailed");
  const [expectedState, next] = stored.split("|");
  if (expectedState !== state) return fail("oauthFailed");

  try {
    const profile = await exchangeGoogleCode(code);
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
    const user = await upsertGoogleUser(profile, isLocale(cookieLocale) ? cookieLocale : "uz");
    if (user.status === "SUSPENDED" || user.deletedAt) return fail("accountSuspended");
    const res = NextResponse.redirect(new URL(safeNext(next) ?? homeForRole(user.role), env.appUrl));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return withSession(req, user.id, res);
  } catch (error) {
    console.error("[oauth] google callback failed", error);
    return fail("oauthFailed");
  }
}
