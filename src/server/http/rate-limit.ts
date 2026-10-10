import { env } from "@/config/env";

/**
 * Fixed-window rate limiter with a pluggable store.
 * - In-memory store for single-instance/dev deployments.
 * - Upstash Redis REST store when UPSTASH_REDIS_REST_URL/TOKEN are configured (serverless-safe).
 */
export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

export class MemoryStore implements RateLimitStore {
  private hits = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    const current = this.hits.get(key);
    if (!current || current.resetAt <= now) {
      const entry = { count: 1, resetAt: now + windowMs };
      this.hits.set(key, entry);
      if (this.hits.size > 10_000) this.sweep(now);
      return entry;
    }
    current.count += 1;
    return current;
  }

  private sweep(now: number) {
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

class UpstashStore implements RateLimitStore {
  constructor(
    private url: string,
    private token: string,
  ) {}

  async increment(key: string, windowMs: number) {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs), "NX"],
        ["PTTL", key],
      ]),
    });
    const data = (await res.json()) as { result: number }[];
    return { count: Number(data[0]?.result ?? 0), resetAt: Date.now() + Number(data[2]?.result ?? windowMs) };
  }
}

const store: RateLimitStore =
  env.rateLimit.upstashUrl && env.rateLimit.upstashToken
    ? new UpstashStore(env.rateLimit.upstashUrl, env.rateLimit.upstashToken)
    : new MemoryStore();

export interface RateLimitRule {
  /** Logical bucket name, e.g. "auth:login". */
  name: string;
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  auth: { name: "auth", limit: 10, windowMs: 60_000 },
  register: { name: "register", limit: 5, windowMs: 10 * 60_000 },
  write: { name: "write", limit: 60, windowMs: 60_000 },
  createRequest: { name: "create-request", limit: 10, windowMs: 60 * 60_000 },
  upload: { name: "upload", limit: 30, windowMs: 10 * 60_000 },
  message: { name: "message", limit: 40, windowMs: 60_000 },
  report: { name: "report", limit: 10, windowMs: 60 * 60_000 },
} satisfies Record<string, RateLimitRule>;

export async function checkRateLimit(rule: RateLimitRule, identifier: string, s: RateLimitStore = store) {
  if (process.env.DISABLE_RATE_LIMIT === "true") return { ok: true, remaining: rule.limit, resetAt: 0 };
  try {
    const { count, resetAt } = await s.increment(`rl:${rule.name}:${identifier}`, rule.windowMs);
    return { ok: count <= rule.limit, remaining: Math.max(0, rule.limit - count), resetAt };
  } catch {
    // Fail open: a broken limiter backend must not take the product down.
    return { ok: true, remaining: rule.limit, resetAt: 0 };
  }
}
