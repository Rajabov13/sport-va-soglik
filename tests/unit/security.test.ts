import { describe, expect, it } from "vitest";
import { detectImageType, isSafeKey } from "@/server/storage/validate";
import { safeNext, homeForRole } from "@/server/auth/redirects";
import { hashToken, sign, unsign } from "@/server/auth/tokens";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { MemoryStore, checkRateLimit } from "@/server/http/rate-limit";
import { distanceKm } from "@/lib/geo";
import { formatDate, startOfToday } from "@/lib/format";

describe("file upload validation", () => {
  it("detects images by magic bytes, not extension", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe("image/png");
    expect(detectImageType(new TextEncoder().encode("RIFF1234WEBPVP8 "))?.mime).toBe("image/webp");
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
  });

  it("rejects path traversal in storage keys", () => {
    expect(isSafeKey("requests/abc123/def456.jpg")).toBe(true);
    expect(isSafeKey("../../etc/passwd")).toBe(false);
    expect(isSafeKey("requests/../secret/x.jpg")).toBe(false);
    expect(isSafeKey("requests/a/b.svg")).toBe(false);
  });
});

describe("auth primitives", () => {
  it("hashes passwords with bcrypt", async () => {
    const hash = await hashPassword("Secret123");
    expect(hash).not.toContain("Secret123");
    expect(await verifyPassword("Secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("x", null)).toBe(false);
  });

  it("stores only token digests and verifies signatures", () => {
    expect(hashToken("abc")).toHaveLength(64);
    expect(hashToken("abc")).not.toBe("abc");
    const s = sign("state|/dashboard");
    expect(unsign(s)).toBe("state|/dashboard");
    expect(unsign(s.replace("state", "evil!"))).toBeNull();
    expect(unsign("garbage")).toBeNull();
  });

  it("prevents open redirects", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("/\\evil.com")).toBeNull();
    expect(homeForRole("ADMIN")).toBe("/admin");
  });
});

describe("rate limiting", () => {
  it("blocks after the limit within a window", async () => {
    const store = new MemoryStore();
    const rule = { name: "t", limit: 3, windowMs: 60_000 };
    const prev = process.env.DISABLE_RATE_LIMIT;
    process.env.DISABLE_RATE_LIMIT = "false";
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await checkRateLimit(rule, "1.2.3.4", store)).ok);
    process.env.DISABLE_RATE_LIMIT = prev;
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("utils", () => {
  it("computes haversine distance", () => {
    const d = distanceKm({ lat: 41.2995, lng: 69.2401 }, { lat: 39.6542, lng: 66.9597 });
    expect(d).toBeGreaterThan(260);
    expect(d).toBeLessThan(275);
  });

  it("formats Uzbek dates without relying on browser ICU data", () => {
    expect(formatDate("uz", "2026-07-13T08:00:00Z")).toBe("13-iyl, 2026");
    expect(startOfToday(new Date("2026-10-10T12:00:00Z")).toISOString()).toBe("2026-10-09T19:00:00.000Z");
  });
});
