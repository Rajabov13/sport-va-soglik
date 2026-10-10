import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import type { Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { ApiError, Errors } from "./errors";
import { checkRateLimit, RATE_LIMITS, type RateLimitRule } from "./rate-limit";
import { getUserBySessionToken, type SessionUser } from "@/server/auth/session";
import { SESSION_COOKIE } from "@/server/auth/constants";
import { env } from "@/config/env";

type Params = Record<string, string>;
type RouteContext = { params: Promise<Params> };

export interface HandlerContext<P extends Params> {
  req: NextRequest;
  params: P;
  ip: string;
}

interface Options {
  roles?: Role[];
  rateLimit?: RateLimitRule;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
  );
}

/** Reject cross-site state-changing requests (defence in depth on top of SameSite=Lax cookies). */
function assertSameOrigin(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return;
  if (req.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "csrf");
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "csrf");
  }
  const allowed = new Set([host, new URL(env.appUrl).host].filter(Boolean));
  if (!allowed.has(originHost)) throw new ApiError(403, "csrf");
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, fieldErrors: error.fieldErrors } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "validation", fieldErrors: error.flatten().fieldErrors } },
      { status: 422 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return NextResponse.json({ error: { code: "notFound" } }, { status: 404 });
    if (error.code === "P2002") return NextResponse.json({ error: { code: "conflict" } }, { status: 409 });
  }
  // Never leak internals to the client.
  console.error("[api] unhandled error", error);
  return NextResponse.json({ error: { code: "server" } }, { status: 500 });
}

function toResponse(result: unknown) {
  if (result instanceof Response) return result;
  return NextResponse.json({ data: result ?? null });
}

async function prepare(req: NextRequest, ctx: RouteContext, options: Options) {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const rule = options.rateLimit ?? (SAFE_METHODS.has(req.method) ? undefined : RATE_LIMITS.write);
  if (rule) {
    const result = await checkRateLimit(rule, ip);
    if (!result.ok) throw Errors.rateLimited();
  }
  const params = ((await ctx?.params) ?? {}) as Params;
  return { ip, params };
}

/** Route handler that does not require authentication (user is optional). */
export function publicRoute<P extends Params = Params>(
  handler: (ctx: HandlerContext<P> & { user: SessionUser | null }) => Promise<unknown>,
  options: Options = {},
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const { ip, params } = await prepare(req, ctx, options);
      const user = await getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
      return toResponse(await handler({ req, params: params as P, ip, user }));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Route handler that requires a valid session, optionally restricted to roles. */
export function authRoute<P extends Params = Params>(
  handler: (ctx: HandlerContext<P> & { user: SessionUser }) => Promise<unknown>,
  options: Options = {},
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const { ip, params } = await prepare(req, ctx, options);
      const user = await getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
      if (!user) throw Errors.unauthorized();
      if (options.roles && !options.roles.includes(user.role)) throw Errors.forbidden();
      return toResponse(await handler({ req, params: params as P, ip, user }));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function parseJson<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw Errors.validation();
  }
  return schema.parse(body);
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}
