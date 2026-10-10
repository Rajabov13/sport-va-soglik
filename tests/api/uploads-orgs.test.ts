import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as upload } from "@/app/api/uploads/route";
import { GET as serveFile } from "@/app/api/files/[...key]/route";
import { POST as createRequest } from "@/app/api/requests/route";
import { GET as getRequest } from "@/app/api/requests/[id]/route";
import { POST as requestAction } from "@/app/api/requests/[id]/[action]/route";
import { POST as attach } from "@/app/api/conversations/[id]/attachments/route";
import { POST as createCampaign } from "@/app/api/campaigns/route";
import { POST as joinCampaign } from "@/app/api/campaigns/[id]/join/route";
import { POST as joinOrg } from "@/app/api/organizations/[id]/join/route";
import { GET as members } from "@/app/api/organization/members/route";
import { POST as memberAction } from "@/app/api/organization/members/[id]/route";
import { POST as adminOrgAction } from "@/app/api/admin/organizations/[id]/route";
import { POST as classify } from "@/app/api/ai/classify/route";
import { GET as mapData } from "@/app/api/map/route";
import { db } from "@/server/db";
import { call, createUser, requestPayload, resetDb, seedReference } from "../helpers";

// 1×1 transparent PNG
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"));

function uploadRequest(path: string, cookie: string, bytes: Uint8Array, type: string, name: string) {
  const form = new FormData();
  form.append("file", new File([Buffer.from(bytes)], name, { type }));
  return new NextRequest(`http://localhost:3000${path}`, { method: "POST", body: form, headers: { cookie } });
}

let ref: Awaited<ReturnType<typeof seedReference>>;
let user: Awaited<ReturnType<typeof createUser>>;
let volunteer: Awaited<ReturnType<typeof createUser>>;
let outsider: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  await resetDb();
  ref = await seedReference();
  user = await createUser("USER");
  volunteer = await createUser("VOLUNTEER", { volunteer: { categoryIds: [ref.medicine.id] } });
  outsider = await createUser("USER");
});

describe("image uploads", () => {
  it("accepts a real PNG, attaches it to a request and serves it", async () => {
    const res = await upload(uploadRequest("/api/uploads", user.cookie, PNG, "image/png", "photo.png"), { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const img = ((await res.json()) as { data: { id: string; url: string } }).data;
    expect(img.url).toMatch(/^\/api\/files\/requests\//);
    const created = await call(createRequest, { cookie: user.cookie, body: requestPayload(ref.medicine.id, ref.tashkent.id, { imageIds: [img.id] }) });
    const id = (created.json!.data as { id: string }).id;
    const detail = await call(getRequest, { cookie: user.cookie, params: { id } });
    expect((detail.json!.data as { images: { id: string }[] }).images.map((i) => i.id)).toEqual([img.id]);
    const key = img.url.replace("/api/files/", "").split("/");
    const file = await serveFile(new NextRequest(`http://localhost:3000${img.url}`), { params: Promise.resolve({ key }) });
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("image/png");
    expect(file.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rejects files that are not real images, whatever their extension or MIME type", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
    const res = await upload(uploadRequest("/api/uploads", user.cookie, svg, "image/png", "evil.png"), { params: Promise.resolve({}) });
    expect(res.status).toBe(415);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("fileType");
  });

  it("enforces the size limit", async () => {
    const big = new Uint8Array(6 * 1024 * 1024);
    big.set(PNG.slice(0, 8));
    const res = await upload(uploadRequest("/api/uploads", user.cookie, big, "image/png", "big.png"), { params: Promise.resolve({}) });
    expect(res.status).toBe(413);
  });

  it("requires authentication", async () => {
    const res = await upload(uploadRequest("/api/uploads", "", PNG, "image/png", "x.png"), { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("keeps chat attachments private to conversation participants", async () => {
    const created = await call(createRequest, { cookie: user.cookie, body: requestPayload(ref.medicine.id, ref.tashkent.id, { title: "Rasm bilan ariza kerak" }) });
    const id = (created.json!.data as { id: string }).id;
    await call(requestAction, { cookie: volunteer.cookie, body: {}, params: { id, action: "accept" } });
    const conv = await db.conversation.findUniqueOrThrow({ where: { requestId: id } });
    const res = await attach(uploadRequest(`/api/conversations/${conv.id}/attachments`, user.cookie, PNG, "image/png", "receipt.png"), { params: Promise.resolve({ id: conv.id }) });
    expect(res.status).toBe(201);
    const msg = ((await res.json()) as { data: { attachments: { url: string }[] } }).data;
    const url = msg.attachments[0].url;
    const key = url.replace("/api/files/", "").split("/");
    const asVolunteer = await serveFile(new NextRequest(`http://localhost:3000${url}`, { headers: { cookie: volunteer.cookie } }), { params: Promise.resolve({ key }) });
    expect(asVolunteer.status).toBe(200);
    const asOutsider = await serveFile(new NextRequest(`http://localhost:3000${url}`, { headers: { cookie: outsider.cookie } }), { params: Promise.resolve({ key }) });
    expect(asOutsider.status).toBe(404);
    const anonymous = await serveFile(new NextRequest(`http://localhost:3000${url}`), { params: Promise.resolve({ key }) });
    expect(anonymous.status).toBe(404);
    const traversal = await serveFile(new NextRequest("http://localhost:3000/api/files/../../.env"), { params: Promise.resolve({ key: ["..", "..", ".env"] }) });
    expect(traversal.status).toBe(404);
  });
});

describe("organizations & campaigns", () => {
  it("unverified organizations cannot create campaigns until an admin verifies them", async () => {
    const org = await createUser("ORGANIZATION");
    const admin = await createUser("ADMIN");
    const organization = await db.organization.create({
      data: { ownerId: org.user.id, name: "Yordam Markazi", slug: `yordam-${Date.now()}`, description: "Test tashkiloti tavsifi", status: "PENDING", members: { create: { userId: org.user.id, role: "OWNER", status: "ACTIVE" } } },
    });
    const campaign = { title: "Bahorgi hashar aksiyasi", description: "Mahallalarda daraxt ekish va tozalash bo'yicha katta aksiya.", startsAt: new Date().toISOString().slice(0, 10), goalHelps: 20, goalVolunteers: 10 };
    expect((await call(createCampaign, { cookie: org.cookie, body: campaign })).status).toBe(403);
    expect((await call(adminOrgAction, { cookie: admin.cookie, body: { action: "verify" }, params: { id: organization.id } })).status).toBe(200);
    const created = await call(createCampaign, { cookie: org.cookie, body: campaign });
    expect(created.status).toBe(201);
    const campaignId = (created.json!.data as { id: string }).id;

    // Volunteers join the campaign and request to join the team; the owner approves.
    expect((await call(joinCampaign, { cookie: volunteer.cookie, body: {}, params: { id: campaignId } })).status).toBe(200);
    expect(await db.campaignParticipant.count({ where: { campaignId } })).toBe(1);
    expect((await call(joinOrg, { cookie: volunteer.cookie, body: {}, params: { id: organization.id } })).status).toBe(200);
    const list = await call(members, { cookie: org.cookie });
    const member = (list.json!.data as { id: string; status: string }[])[0];
    expect(member.status).toBe("PENDING");
    expect((await call(memberAction, { cookie: org.cookie, body: { action: "approve" }, params: { id: member.id } })).status).toBe(200);
    expect((await db.organizationMember.findUniqueOrThrow({ where: { id: member.id } })).status).toBe("ACTIVE");
    // Another organization cannot manage this team.
    const otherOrg = await createUser("ORGANIZATION");
    await db.organization.create({ data: { ownerId: otherOrg.user.id, name: "Boshqa", slug: `boshqa-${Date.now()}`, description: "Boshqa tashkilot tavsifi", status: "VERIFIED" } });
    expect((await call(memberAction, { cookie: otherOrg.cookie, body: { action: "remove" }, params: { id: member.id } })).status).toBe(404);
  });
});

describe("assistive features", () => {
  it("suggests category and urgency (keyword fallback without an AI key)", async () => {
    const res = await call(classify, { cookie: user.cookie, body: { text: "Onamga dorixonadan dori kerak, juda shoshilinch!" } });
    expect(res.status).toBe(200);
    const d = res.json!.data as { categorySlug: string; categoryId: string; urgency: string; source: string };
    expect(d.categorySlug).toBe("medicine");
    expect(d.categoryId).toBe(ref.medicine.id);
    expect(d.urgency).toBe("CRITICAL");
    expect(d.source).toBe(process.env.GEMINI_API_KEY ? "ai" : "keywords");
  });

  it("serves coarse public map data without exact coordinates", async () => {
    const res = await call(mapData, { path: "/api/map?status=all&layers=requests" });
    const items = (res.json!.data as { requests: { latitude: number; longitude: number; address?: string }[] }).requests;
    expect(items.length).toBeGreaterThan(0);
    for (const r of items) {
      expect(Math.round(r.latitude * 100) / 100).toBe(r.latitude);
      expect(r.address).toBeUndefined();
    }
  });
});
