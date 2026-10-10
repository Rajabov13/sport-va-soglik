import { NextResponse, type NextRequest } from "next/server";
import { googleAuthUrl, googleConfigured } from "@/server/auth/google";
import { generateToken, sign } from "@/server/auth/tokens";
import { OAUTH_STATE_COOKIE } from "@/server/auth/constants";
import { safeNext } from "@/server/auth/redirects";
import { env } from "@/config/env";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/auth/login?error=oauthNotConfigured", env.appUrl));
  }
  const state = generateToken(16);
  const next = safeNext(req.nextUrl.searchParams.get("next")) ?? "";
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set(OAUTH_STATE_COOKIE, sign(`${state}|${next}`), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
