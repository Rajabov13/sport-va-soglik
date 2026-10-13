import { beforeEach, describe, expect, it, vi } from "vitest";

const row = { id: "r1", slug: "s1", title: "Test", name: "Org", nameUz: "Kat", description: "D", urgency: "HIGH", status: "MATCHING", type: "NGO",
  peopleCount: 1, estimatedHours: 2, createdAt: new Date(), startsAt: new Date(), goalHelps: 5, goalVolunteers: 5,
  category: { nameUz: "Kat" }, location: { city: "Toshkent", region: "Toshkent" }, organization: { id: "o1", name: "Org" },
  _count: { participants: 1, requests: 1, members: 2, campaigns: 1 } };
const model = { count: vi.fn(async () => 7), findMany: vi.fn(async () => [row]), findFirst: vi.fn(async () => row), findUnique: vi.fn(async () => row) };
vi.mock("@/server/db", () => ({ db: { request: model, campaign: model, organization: model, category: { ...model, findMany: vi.fn(async () => [{ slug: "food", nameUz: "Oziq", _count: { requests: 3 } }]) } } }));
vi.mock("@/server/services/stats", () => ({
  getPublicImpactStats: async () => ({ totalRequests: 1, completedRequests: 1, openRequests: 0, activeVolunteers: 1, organizations: 1, peopleHelped: 1, helpedToday: 0, avgResponseMinutes: 3, successRate: 100, volunteerHours: 2, impactPoints: 9 }),
  getPublicLeaderboard: async () => [{ rank: 1, name: "Ali", xp: 10, completedCount: 1, hoursTotal: 2, ratingAvg: 5 }],
}));

const calls: { method: string; body: Record<string, unknown> }[] = [];
beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ method: url.split("/").pop()!, body: JSON.parse(init.body as string) });
    return new Response("{}");
  }));
});

const { handleUpdate } = await import("@/server/telegram/bot");
const msg = (text: string) => ({ message: { chat: { id: 1 }, from: { first_name: "Ali" }, text } });
const cb = (data: string) => ({ callback_query: { id: "q", data, message: { chat: { id: 1 }, message_id: 9 } } });

describe("telegram bot", () => {
  it.each(["/start", "/menu", "/help", "/about", "/join", "/stats", "/top", "/categories", "/requests", "/campaigns", "/organizations", "/map", "/request_food", "🆘 So‘rovlar", "salom"])(
    "answers %s", async (text) => {
      await handleUpdate(msg(text));
      expect(calls.at(-1)?.method).toBe("sendMessage");
      expect(String(calls.at(-1)?.body.text)).not.toContain("Xatolik");
    });
  it.each(["menu", "help", "join", "stats", "top", "cats", "map", "req:all:0", "req:food:1", "rq:r1:all:0", "camp:0", "cp:r1:0", "org:0", "og:o1:0"])(
    "edits message for %s", async (data) => {
      await handleUpdate(cb(data));
      expect(calls[0].method).toBe("answerCallbackQuery");
      expect(calls.at(-1)?.method).toBe("editMessageText");
    });
});
