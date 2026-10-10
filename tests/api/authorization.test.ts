import { beforeAll, describe, expect, it } from "vitest";
import { POST as createRequest, GET as listRequests } from "@/app/api/requests/route";
import { GET as getRequest, PATCH as patchRequest, DELETE as deleteRequest } from "@/app/api/requests/[id]/route";
import { POST as requestAction } from "@/app/api/requests/[id]/[action]/route";
import { GET as adminUsers } from "@/app/api/admin/users/route";
import { POST as adminUserAction } from "@/app/api/admin/users/[id]/route";
import { POST as adminRequestAction } from "@/app/api/admin/requests/[id]/route";
import { GET as adminOverview } from "@/app/api/admin/overview/route";
import { PUT as volunteerProfile } from "@/app/api/volunteer/profile/route";
import { POST as createCampaign } from "@/app/api/campaigns/route";
import { POST as report } from "@/app/api/reports/route";
import { GET as me } from "@/app/api/auth/me/route";
import { db } from "@/server/db";
import { call, createUser, requestPayload, resetDb, seedReference } from "../helpers";

let ref: Awaited<ReturnType<typeof seedReference>>;
let owner: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;
let volunteer: Awaited<ReturnType<typeof createUser>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let requestId: string;

beforeAll(async () => {
  await resetDb();
  ref = await seedReference();
  owner = await createUser("USER");
  stranger = await createUser("USER");
  volunteer = await createUser("VOLUNTEER", { volunteer: { categoryIds: [ref.medicine.id] } });
  admin = await createUser("ADMIN");
  const res = await call(createRequest, { cookie: owner.cookie, body: requestPayload(ref.medicine.id, ref.tashkent.id) });
  requestId = (res.json!.data as { id: string }).id;
});

describe("authentication is required", () => {
  it("anonymous users get 401 on protected endpoints", async () => {
    expect((await call(createRequest, { body: requestPayload(ref.medicine.id, ref.tashkent.id) })).status).toBe(401);
    expect((await call(listRequests, {})).status).toBe(401);
    expect((await call(adminOverview, {})).status).toBe(401);
  });

  it("forged session cookies are rejected", async () => {
    expect((await call(me, { cookie: "qollab_session=forged-token" })).json!.data).toBeNull();
    expect((await call(listRequests, { cookie: "qollab_session=forged-token" })).status).toBe(401);
  });
});

describe("role-based access control", () => {
  it("non-admins cannot reach admin APIs", async () => {
    for (const actor of [owner, volunteer]) {
      expect((await call(adminUsers, { cookie: actor.cookie })).status).toBe(403);
      expect((await call(adminUserAction, { cookie: actor.cookie, body: { action: "suspend" }, params: { id: stranger.user.id } })).status).toBe(403);
    }
    expect((await call(adminUsers, { cookie: admin.cookie })).status).toBe(200);
  });

  it("volunteers cannot create requests and requesters cannot accept them", async () => {
    expect((await call(createRequest, { cookie: volunteer.cookie, body: requestPayload(ref.medicine.id, ref.tashkent.id) })).status).toBe(403);
    expect((await call(requestAction, { cookie: stranger.cookie, body: {}, params: { id: requestId, action: "accept" } })).status).toBe(403);
    expect((await call(requestAction, { cookie: owner.cookie, body: {}, params: { id: requestId, action: "accept" } })).status).toBe(403);
  });

  it("only volunteers manage volunteer profiles; only organizations create campaigns", async () => {
    expect((await call(volunteerProfile, { method: "PUT", cookie: owner.cookie, body: {} })).status).toBe(403);
    expect((await call(createCampaign, { cookie: volunteer.cookie, body: {} })).status).toBe(403);
  });
});

describe("resource ownership", () => {
  it("other users cannot edit, cancel or delete someone else's request", async () => {
    expect((await call(patchRequest, { method: "PATCH", cookie: stranger.cookie, body: { title: "Hacked title!" }, params: { id: requestId } })).status).toBe(403);
    expect((await call(requestAction, { cookie: stranger.cookie, body: {}, params: { id: requestId, action: "cancel" } })).status).toBe(403);
    expect((await call(deleteRequest, { method: "DELETE", cookie: stranger.cookie, params: { id: requestId } })).status).toBe(403);
    const r = await db.request.findUniqueOrThrow({ where: { id: requestId } });
    expect(r.title).not.toBe("Hacked title!");
  });

  it("the owner can edit their own request", async () => {
    const res = await call(patchRequest, { method: "PATCH", cookie: owner.cookie, body: { title: "Dori olib kelish (yangilandi)" }, params: { id: requestId } });
    expect(res.status).toBe(200);
  });

  it("private contact details are not exposed to strangers", async () => {
    const res = await call(getRequest, { cookie: stranger.cookie, params: { id: requestId } });
    const d = res.json!.data as { address: string | null; contactPhone: string | null; requester: { email: string | null }; matches: unknown[] };
    expect(d.address).toBeNull();
    expect(d.contactPhone).toBeNull();
    expect(d.requester.email).toBeNull();
    expect(d.matches).toEqual([]);
  });

  it("drafts are invisible to other users", async () => {
    const draft = await call(createRequest, { cookie: owner.cookie, body: requestPayload(ref.medicine.id, ref.tashkent.id, { title: "Qoralama ariza", asDraft: true }) });
    const id = (draft.json!.data as { id: string; status: string }).id;
    expect((draft.json!.data as { status: string }).status).toBe("DRAFT");
    expect((await call(getRequest, { cookie: stranger.cookie, params: { id } })).status).toBe(403);
    expect((await call(getRequest, { params: { id } })).status).toBe(401);
  });
});

describe("moderation", () => {
  it("flags suspicious requests for manual review and lets admins approve them", async () => {
    const res = await call(createRequest, { cookie: stranger.cookie, body: requestPayload(ref.medicine.id, ref.tashkent.id, { title: "Kripto orqali yordam beramiz" }) });
    const data = res.json!.data as { id: string; status: string; moderation: { approved: boolean; flags: string[] } };
    expect(data.status).toBe("PENDING");
    expect(data.moderation.flags).toContain("blockedContent");
    expect((await call(adminRequestAction, { cookie: owner.cookie, body: { action: "approve" }, params: { id: data.id } })).status).toBe(403);
    expect((await call(adminRequestAction, { cookie: admin.cookie, body: { action: "approve" }, params: { id: data.id } })).status).toBe(200);
    expect((await db.request.findUniqueOrThrow({ where: { id: data.id } })).status).toBe("MATCHING");
  });

  it("accepts reports and lets admins suspend users (which revokes sessions)", async () => {
    const r = await call(report, { cookie: owner.cookie, body: { targetType: "USER", targetId: stranger.user.id, reason: "SUSPICIOUS_USER", details: "Spam" } });
    expect(r.status).toBe(201);
    expect((await call(report, { cookie: owner.cookie, body: { targetType: "CONVERSATION", targetId: "not-mine", reason: "ABUSE" } })).status).toBe(403);
    expect((await call(adminUserAction, { cookie: admin.cookie, body: { action: "suspend", reason: "spam" }, params: { id: stranger.user.id } })).status).toBe(200);
    expect((await call(me, { cookie: stranger.cookie })).json!.data).toBeNull();
    // Admins cannot lock themselves out.
    expect((await call(adminUserAction, { cookie: admin.cookie, body: { action: "suspend" }, params: { id: admin.user.id } })).status).toBe(403);
  });
});
