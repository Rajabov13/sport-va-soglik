import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { env } from "@/config/env";

const DEV_FALLBACK_SECRET = "qollab-development-only-secret-not-for-production";

function secret() {
  return env.sessionSecret || DEV_FALLBACK_SECRET;
}

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Session tokens are stored as HMAC digests so a database leak does not expose live sessions. */
export function hashToken(token: string) {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

export function sign(value: string) {
  const sig = createHmac("sha256", secret()).update(value).digest("base64url");
  return `${value}.${sig}`;
}

export function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(signed);
  if (expected.length !== actual.length) return null;
  return timingSafeEqual(expected, actual) ? value : null;
}
