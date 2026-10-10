import { beforeAll, describe, expect, it } from "vitest";
import { POST as createRequest } from "@/app/api/requests/route";
import { GET as getRequest } from "@/app/api/requests/[id]/route";
import { POST as requestAction } from "@/app/api/requests/[id]/[action]/route";
import { GET as getMatches } from "@/app/api/requests/matches/route";
import { GET as getMessages, POST as postMessage } from "@/app/api/conversations/[id]/messages/route";
import { GET as getStats } from "@/app/api/stats/route";
import { GET as notifications } from "@/app/api/notifications/route";
import { db } from "@/server/db";
import { call, createUser, requestPayload, resetDb, seedReference } from "../helpers";

let ref: Awaited<ReturnType<typeof seedReference>>;
let requester: Awaited<ReturnType<typeof createUser>>;
let volunteer: Awaited<ReturnType<typeof createUser>>;
let rival: Awaited<ReturnType<typeof createUser>>;
let requestId: string;

beforeAll(async () => {
  await resetDb();
  ref = await seedReference();
  requester = await createUser("USER");
  // Nine completed helps already: the tenth unlocks the "10 Helps" achievement.
  volunteer = await createUser("VOLUNTEER", { volunteer: { categoryIds: [ref.medicine.id], skills: ["driving", "medical"], completed: 9 } });
  rival = await createUser("VOLUNTEER", { volunteer: { categoryIds: [ref.education.id], skills: ["math"], lat: 41.33, lng: 69.3 } });
});

const act = (action: string, cookie: string, body: unknown = {}) => call(requestAction, { cookie, body, params: { id: requestId, action } });

describe("end-to-end request lifecycle", () => {
  it("creates an urgent request that is auto-verified and matched", async () => {
    const res = await call(createRequest, { cookie: requester.cookie, body: requestPayload(ref.medicine.id, ref.tashkent.id, { urgency: "CRITICAL" }) });
    expect(res.status).toBe(201);
    const data = res.json!.data as { id: string; status: string };
    requestId = data.id;
    expect(data.status).toBe("MATCHING");
    const history = await db.requestStatusHistory.findMany({ where: { requestId }, orderBy: { createdAt: "asc" } });
    expect(history.map((h) => h.toStatus)).toEqual(["DRAFT", "PENDING", "VERIFIED", "MATCHING"]);
  });

  it("ranks the best volunteer first and notifies them", async () => {
    const detail = await call(getRequest, { cookie: requester.cookie, params: { id: requestId } });
    const d = detail.json!.data as { matches: { volunteerId: string; score: number }[] };
    expect(d.matches.length).toBeGreaterThanOrEqual(2);
    expect(d.matches[0].volunteerId).toBe(volunteer.user.id);
    expect(d.matches[0].score).toBeGreaterThan(d.matches[1].score);
    const matches = await call(getMatches, { cookie: volunteer.cookie });
    expect((matches.json!.data as { id: string }[]).map((m) => m.id)).toContain(requestId);
    const notes = await call(notifications, { cookie: volunteer.cookie, path: "/api/notifications?page=1&pageSize=10" });
    expect((notes.json!.data as { items: { type: string }[] }).items.some((n) => n.type === "NEW_MATCH")).toBe(true);
  });

  it("hides the exact address from volunteers until they accept", async () => {
    const before = await call(getRequest, { cookie: volunteer.cookie, params: { id: requestId } });
    expect((before.json!.data as { address: string | null }).address).toBeNull();
  });

  it("lets exactly one volunteer accept (transactional guard)", async () => {
    const [a, b] = await Promise.all([act("accept", volunteer.cookie), act("accept", rival.cookie)]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.json!.error!.code).toBe("alreadyAssigned");
    const assignments = await db.requestAssignment.count({ where: { requestId } });
    expect(assignments).toBe(1);
    // Make sure the intended volunteer is the winner for the rest of the flow.
    const winner = await db.requestAssignment.findFirstOrThrow({ where: { requestId } });
    if (winner.volunteerId !== volunteer.user.id) {
      await act("withdraw", rival.cookie);
      expect((await act("accept", volunteer.cookie)).status).toBe(200);
    }
  });

  it("opens a private conversation between the two parties", async () => {
    const detail = await call(getRequest, { cookie: volunteer.cookie, params: { id: requestId } });
    const d = detail.json!.data as { conversationId: string; address: string | null };
    expect(d.address).not.toBeNull();
    const sent = await call(postMessage, { cookie: volunteer.cookie, body: { body: "Assalomu alaykum! Yo'ldaman." }, params: { id: d.conversationId } });
    expect(sent.status).toBe(201);
    const read = await call(getMessages, { cookie: requester.cookie, params: { id: d.conversationId } });
    expect((read.json!.data as { messages: { body: string }[] }).messages.at(-1)!.body).toContain("Assalomu");
    const intruder = await call(getMessages, { cookie: rival.cookie, params: { id: d.conversationId } });
    expect(intruder.status).toBe(403);
  });

  it("enforces the state machine order", async () => {
    expect((await act("complete", volunteer.cookie, { hoursSpent: 1 })).status).toBe(409); // must start first
    expect((await act("start", volunteer.cookie)).status).toBe(200);
    expect((await act("confirm", requester.cookie)).status).toBe(409); // volunteer has not marked it done
    expect((await act("complete", volunteer.cookie, { hoursSpent: 1.5, note: "Dori yetkazildi" })).status).toBe(200);
  });

  it("only the requester can confirm; confirmation updates reputation and unlocks achievements", async () => {
    expect((await act("confirm", volunteer.cookie)).status).toBe(403);
    const res = await act("confirm", requester.cookie);
    expect(res.status).toBe(200);
    const data = res.json!.data as { status: string; xp: number; unlocked: string[] };
    expect(data.status).toBe("COMPLETED");
    expect(data.xp).toBeGreaterThan(50);
    expect(data.unlocked).toContain("TEN_HELPS");
    const profile = await db.volunteerProfile.findUniqueOrThrow({ where: { userId: volunteer.user.id } });
    expect(profile.completedCount).toBe(10);
    expect(profile.hoursTotal).toBe(1.5);
    expect(profile.peopleHelped).toBe(1);
  });

  it("accepts one review per participant and updates the rating", async () => {
    const res = await act("review", requester.cookie, { rating: 5, comment: "Katta rahmat!" });
    expect(res.status).toBe(200);
    expect((await act("review", requester.cookie, { rating: 4 })).json!.error!.code).toBe("alreadyReviewed");
    expect((await act("review", rival.cookie, { rating: 1 })).status).toBe(403);
    const profile = await db.volunteerProfile.findUniqueOrThrow({ where: { userId: volunteer.user.id } });
    expect(profile.ratingAvg).toBe(5);
    expect(profile.ratingCount).toBe(1);
  });

  it("reflects the completed help in live impact statistics", async () => {
    const res = await call(getStats, {});
    const stats = (res.json!.data as { stats: { completedRequests: number; peopleHelped: number; volunteerHours: number; helpedToday: number } }).stats;
    expect(stats.completedRequests).toBe(1);
    expect(stats.peopleHelped).toBe(1);
    expect(stats.helpedToday).toBe(1);
    expect(stats.volunteerHours).toBe(2); // 1.5 rounded
  });
});

describe("withdrawal", () => {
  it("returns the request to matching and revokes chat access", async () => {
    const res = await call(createRequest, { cookie: requester.cookie, body: requestPayload(ref.medicine.id, ref.tashkent.id, { title: "Ikkinchi ariza: dori kerak" }) });
    const id = (res.json!.data as { id: string }).id;
    expect((await call(requestAction, { cookie: volunteer.cookie, body: {}, params: { id, action: "accept" } })).status).toBe(200);
    const conv = await db.conversation.findUniqueOrThrow({ where: { requestId: id } });
    expect((await call(getMessages, { cookie: volunteer.cookie, params: { id: conv.id } })).status).toBe(200);
    const w = await call(requestAction, { cookie: volunteer.cookie, body: {}, params: { id, action: "withdraw" } });
    expect((w.json!.data as { status: string }).status).toBe("MATCHING");
    expect((await call(getMessages, { cookie: volunteer.cookie, params: { id: conv.id } })).status).toBe(403);
    const profile = await db.volunteerProfile.findUniqueOrThrow({ where: { userId: volunteer.user.id } });
    expect(profile.cancelledCount).toBe(1);
    // The withdrawn volunteer is excluded from re-matching.
    const matches = await db.requestMatch.findMany({ where: { requestId: id, declinedAt: null } });
    expect(matches.map((m) => m.volunteerId)).not.toContain(volunteer.user.id);
  });
});
