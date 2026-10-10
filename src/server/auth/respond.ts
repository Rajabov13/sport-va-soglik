import { NextResponse, type NextRequest } from "next/server";
import { createSession, sessionCookieOptions } from "./session";
import { SESSION_COOKIE } from "./constants";
import { clientIp } from "@/server/http/api";

/** Create a session for the user and attach the httpOnly cookie to the response. */
export async function withSession<T extends NextResponse>(req: NextRequest, userId: string, res: T): Promise<T> {
  const session = await createSession(userId, { userAgent: req.headers.get("user-agent"), ip: clientIp(req) });
  res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.maxAgeSeconds));
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
