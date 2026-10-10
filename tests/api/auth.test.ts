import { beforeAll, describe, expect, it } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as demo } from "@/app/api/auth/demo/route";
import { db } from "@/server/db";
import { SESSION_COOKIE } from "@/server/auth/constants";
import { call, createUser, resetDb, seedReference } from "../helpers";

const cookieFrom = (res: Response) => {
  const raw = res.headers.get("set-cookie") ?? "";
  const m = raw.match(new RegExp(`${SESSION_COOKIE}=([^;]*)`));
  return m ? `${SESSION_COOKIE}=${m[1]}` : "";
};

beforeAll(async () => {
  await resetDb();
  await seedReference();
});

describe("registration", () => {
  it("registers a volunteer, hashes the password and starts a session", async () => {
    const { status, json, res } = await call(register, {
      body: { name: "Aziz Karimov", email: "Aziz@Example.com", password: "Secret123", role: "VOLUNTEER", acceptTerms: true },
    });
    expect(status).toBe(201);
    expect((json!.data as { redirectTo: string }).redirectTo).toBe("/dashboard/volunteer");
    const user = await db.user.findUniqueOrThrow({ where: { email: "aziz@example.com" }, include: { volunteerProfile: true } });
    expect(user.passwordHash).not.toBe("Secret123");
    expect(user.passwordHash?.startsWith("$2")).toBe(true);
    expect(user.volunteerProfile).not.toBeNull();
    const cookie = cookieFrom(res);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    const who = await call(me, { cookie });
    expect((who.json!.data as { email: string }).email).toBe("aziz@example.com");
  });

  it("creates an organization (pending verification) for organization accounts", async () => {
    const { status } = await call(register, {
      body: { name: "Malika", email: "org@example.com", password: "Secret123", role: "ORGANIZATION", organizationName: "Mehr Uyi", acceptTerms: true },
    });
    expect(status).toBe(201);
    const org = await db.organization.findFirstOrThrow({ where: { name: "Mehr Uyi" } });
    expect(org.status).toBe("PENDING");
  });

  it("rejects duplicate emails with a field error", async () => {
    const { status, json } = await call(register, { body: { name: "Aziz", email: "aziz@example.com", password: "Secret123", role: "USER", acceptTerms: true } });
    expect(status).toBe(409);
    expect(json!.error!.code).toBe("emailTaken");
    expect(json!.error!.fieldErrors!.email).toEqual(["emailTaken"]);
  });

  it("never trusts a client-supplied ADMIN role", async () => {
    const { status, json } = await call(register, { body: { name: "Hacker", email: "hacker@example.com", password: "Secret123", role: "ADMIN", acceptTerms: true } });
    expect(status).toBe(422);
    expect(json!.error!.code).toBe("validation");
    expect(await db.user.findUnique({ where: { email: "hacker@example.com" } })).toBeNull();
  });

  it("returns field-level validation errors", async () => {
    const { status, json } = await call(register, { body: { name: "A", email: "nope", password: "123", role: "USER", acceptTerms: false } });
    expect(status).toBe(422);
    expect(Object.keys(json!.error!.fieldErrors!)).toEqual(expect.arrayContaining(["name", "email", "password", "acceptTerms"]));
  });
});

describe("login / logout", () => {
  it("logs in with correct credentials and out again", async () => {
    const ok = await call(login, { body: { email: "aziz@example.com", password: "Secret123" } });
    expect(ok.status).toBe(200);
    const cookie = cookieFrom(ok.res);
    expect((await call(me, { cookie })).json!.data).not.toBeNull();
    await call(logout, { cookie, body: {} });
    expect((await call(me, { cookie })).json!.data).toBeNull();
  });

  it("rejects wrong passwords without revealing which part was wrong", async () => {
    const wrong = await call(login, { body: { email: "aziz@example.com", password: "Wrong1234" } });
    const unknown = await call(login, { body: { email: "nobody@example.com", password: "Wrong1234" } });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.json!.error!.code).toBe(unknown.json!.error!.code);
  });

  it("blocks suspended accounts", async () => {
    const { user } = await createUser("USER", { status: "SUSPENDED", password: "Password123" });
    const res = await call(login, { body: { email: user.email, password: "Password123" } });
    expect(res.status).toBe(403);
    expect(res.json!.error!.code).toBe("accountSuspended");
  });

  it("rejects cross-site state-changing requests (CSRF defence)", async () => {
    const res = await call(login, { body: { email: "aziz@example.com", password: "Secret123" }, headers: { origin: "https://evil.example" } });
    expect(res.status).toBe(403);
    expect(res.json!.error!.code).toBe("csrf");
  });

  it("demo login works only for seeded demo accounts", async () => {
    const res = await call(demo, { body: { persona: "user" } });
    expect(res.status).toBe(404); // no demo accounts in the test database
    await db.user.create({ data: { email: "demo.user@example.com", name: "Demo", role: "USER", isDemo: true } });
    const ok = await call(demo, { body: { persona: "user" } });
    expect(ok.status).toBe(200);
    expect(cookieFrom(ok.res)).toContain(SESSION_COOKIE);
  });
});
