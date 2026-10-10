import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "qollab_session";
const PROTECTED = ["/dashboard", "/admin"];

/**
 * Edge gate: bounce visitors without a session cookie away from private areas.
 * Real authentication and role checks happen server-side in layouts and API handlers.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
