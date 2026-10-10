import { NextResponse } from "next/server";
import { publicRoute } from "@/server/http/api";
import { destroySession } from "@/server/auth/session";
import { clearSessionCookie } from "@/server/auth/respond";
import { SESSION_COOKIE } from "@/server/auth/constants";

export const POST = publicRoute(async ({ req }) => {
  await destroySession(req.cookies.get(SESSION_COOKIE)?.value);
  return clearSessionCookie(NextResponse.json({ data: { ok: true } }));
});
