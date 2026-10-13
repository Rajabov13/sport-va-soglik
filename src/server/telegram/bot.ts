import { db } from "@/server/db";
import { env } from "@/config/env";
import { getPublicImpactStats, getPublicLeaderboard } from "@/server/services/stats";

/** Minimal Telegram Bot API client — no extra dependency, works on serverless. */
async function api(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${env.telegram.botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`[telegram] ${method} failed`, res.status, await res.text());
}

type Button = { text: string; callback_data?: string; url?: string };
type Keyboard = Button[][];

const PAGE_SIZE = 5;
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const link = (path: string) => `${env.appUrl.replace(/\/$/, "")}${path}`;
const fmtDate = (d: Date) => d.toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "numeric" });

const URGENCY: Record<string, string> = { LOW: "🟢 Past", MEDIUM: "🟡 O‘rta", HIGH: "🟠 Yuqori", CRITICAL: "🔴 Juda shoshilinch" };
const STATUS: Record<string, string> = {
  VERIFIED: "Tasdiqlangan",
  MATCHING: "Ko‘ngilli qidirilmoqda",
  ACCEPTED: "Qabul qilingan",
  IN_PROGRESS: "Bajarilmoqda",
  COMPLETED: "Bajarildi",
};
const ORG_TYPE: Record<string, string> = { NGO: "NNT", GOVERNMENT: "Davlat", CHARITY: "Xayriya", COMMUNITY: "Jamoa" };

const replyMenu = {
  keyboard: [
    [{ text: "🆘 So‘rovlar" }, { text: "📣 Kampaniyalar" }],
    [{ text: "🏢 Tashkilotlar" }, { text: "🏆 Reyting" }],
    [{ text: "📊 Statistika" }, { text: "🗺 Xarita" }],
    [{ text: "📂 Kategoriyalar" }, { text: "ℹ️ Yordam" }],
  ],
  resize_keyboard: true,
};

const back: Button = { text: "🏠 Bosh menyu", callback_data: "menu" };

/** Sends a new message, or edits the one the button was pressed on (keeps the chat tidy). */
async function show(chatId: number, text: string, keyboard: Keyboard = [], messageId?: number) {
  const body = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: keyboard } };
  if (messageId) return api("editMessageText", { ...body, message_id: messageId });
  return api("sendMessage", body);
}

function pager(prefix: string, page: number, total: number): Button[] {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const row: Button[] = [];
  if (page > 0) row.push({ text: "⬅️", callback_data: `${prefix}:${page - 1}` });
  row.push({ text: `${page + 1}/${pages}`, callback_data: "noop" });
  if (page + 1 < pages) row.push({ text: "➡️", callback_data: `${prefix}:${page + 1}` });
  return row;
}

// ───────────────────────────── Sections ─────────────────────────────

async function start(chatId: number, name: string) {
  await api("sendMessage", {
    chat_id: chatId,
    parse_mode: "HTML",
    text: `Assalomu alaykum, <b>${esc(name)}</b>! 👋\n\n<b>QO‘LLAB</b> — <i>Yaxshilikni birlashtiramiz.</i>\nYordamga muhtojlar, ko‘ngillilar va tashkilotlarni bog‘laymiz.`,
    reply_markup: replyMenu,
  });
  await menu(chatId);
}

async function menu(chatId: number, messageId?: number) {
  await show(
    chatId,
    "🏠 <b>Bosh menyu</b>\nQaysi bo‘limni ko‘rmoqchisiz?",
    [
      [{ text: "🆘 Yordam so‘rovlari", callback_data: "req:all:0" }],
      [{ text: "📣 Kampaniyalar", callback_data: "camp:0" }, { text: "🏢 Tashkilotlar", callback_data: "org:0" }],
      [{ text: "🏆 Reyting", callback_data: "top" }, { text: "📊 Statistika", callback_data: "stats" }],
      [{ text: "📂 Kategoriyalar", callback_data: "cats" }, { text: "🗺 Xarita", callback_data: "map" }],
      [{ text: "🙋 Ko‘ngilli bo‘lish", callback_data: "join" }, { text: "ℹ️ Yordam", callback_data: "help" }],
    ],
    messageId,
  );
}

async function help(chatId: number, messageId?: number) {
  await show(
    chatId,
    [
      "ℹ️ <b>Buyruqlar</b>",
      "",
      "/start — boshlash",
      "/menu — bosh menyu",
      "/requests — ochiq yordam so‘rovlari",
      "/campaigns — faol kampaniyalar",
      "/organizations — tashkilotlar",
      "/top — eng faol ko‘ngillilar",
      "/stats — platforma statistikasi",
      "/categories — kategoriyalar",
      "/map — xarita",
      "/join — ko‘ngilli bo‘lish",
      "/about — loyiha haqida",
    ].join("\n"),
    [[back]],
    messageId,
  );
}

async function about(chatId: number, messageId?: number) {
  await show(
    chatId,
    [
      "💚 <b>QO‘LLAB haqida</b>",
      "",
      "<i>Har bir yaxshilik o‘z manzilini topsin.</i>",
      "",
      "QO‘LLAB — O‘zbekiston uchun ijtimoiy yordam platformasi. Har bir so‘rov tekshiriladi, unga eng mos ko‘ngilli topiladi va yordam yetkazilgach natija o‘lchanadi.",
      "",
      "1️⃣ So‘rov yuboriladi → avtomatik tekshiruv",
      "2️⃣ Aqlli moslashtirish → ko‘ngilli qabul qiladi",
      "3️⃣ Chat orqali kelishiladi → yordam beriladi",
      "4️⃣ Tasdiqlash → baho, XP va yutuqlar",
    ].join("\n"),
    [[{ text: "🌐 Saytni ochish", url: link("/") }], [back]],
    messageId,
  );
}

async function join(chatId: number, messageId?: number) {
  await show(
    chatId,
    [
      "🙋 <b>Ko‘ngilli bo‘lish</b>",
      "",
      "1. Saytda ro‘yxatdan o‘ting",
      "2. Profilingizda ko‘nikmalar, hudud va bo‘sh vaqtingizni belgilang",
      "3. Tizim sizga mos so‘rovlarni taklif qiladi",
      "4. Yordam bering, XP va nishonlar to‘plang 🏅",
      "",
      "Yordam kerakmi? Ro‘yxatdan o‘tib, so‘rov yuborishingiz mumkin.",
    ].join("\n"),
    [
      [{ text: "📝 Ro‘yxatdan o‘tish", url: link("/auth/register") }],
      [{ text: "🆘 Yordam so‘rash", url: link("/dashboard/requests/create") }],
      [back],
    ],
    messageId,
  );
}

async function stats(chatId: number, messageId?: number) {
  const s = await getPublicImpactStats();
  await show(
    chatId,
    [
      "📊 <b>QO‘LLAB statistikasi</b>",
      "",
      `📝 Jami so‘rovlar: <b>${s.totalRequests}</b>`,
      `✅ Bajarilgan: <b>${s.completedRequests}</b>`,
      `🆘 Ochiq: <b>${s.openRequests}</b>`,
      `🙋 Faol ko‘ngillilar: <b>${s.activeVolunteers}</b>`,
      `🏢 Tashkilotlar: <b>${s.organizations}</b>`,
      `❤️ Yordam olganlar: <b>${s.peopleHelped}</b> (bugun: ${s.helpedToday})`,
      `⏱ O‘rtacha javob: <b>${s.avgResponseMinutes} daq</b>`,
      `🎯 Muvaffaqiyat: <b>${s.successRate}%</b>`,
      `⌛ Ko‘ngillilik soatlari: <b>${s.volunteerHours}</b>`,
      `⭐ Ta’sir ballari: <b>${s.impactPoints}</b>`,
    ].join("\n"),
    [[{ text: "📈 Batafsil grafiklar", url: link("/impact") }], [{ text: "🔄 Yangilash", callback_data: "stats" }, back]],
    messageId,
  );
}

async function leaderboard(chatId: number, messageId?: number) {
  const rows = await getPublicLeaderboard(10);
  const medal = ["🥇", "🥈", "🥉"];
  const text = rows.length
    ? rows
        .map((r) => `${medal[r.rank - 1] ?? `${r.rank}.`} <b>${esc(r.name)}</b> — ${r.xp} XP · ${r.completedCount} ta yordam · ${r.hoursTotal} soat${r.ratingAvg ? ` · ⭐${r.ratingAvg.toFixed(1)}` : ""}`)
        .join("\n")
    : "Hali reyting yo‘q.";
  await show(chatId, `🏆 <b>Eng faol ko‘ngillilar</b>\n\n${text}`, [[{ text: "🌐 To‘liq reyting", url: link("/") }], [back]], messageId);
}

async function categories(chatId: number, messageId?: number) {
  const cats = await db.category.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, nameUz: true, _count: { select: { requests: { where: { deletedAt: null, status: { in: ["VERIFIED", "MATCHING"] } } } } } },
  });
  if (!cats.length) return show(chatId, "Kategoriyalar topilmadi.", [[back]], messageId);
  const rows: Keyboard = [];
  for (let i = 0; i < cats.length; i += 2) {
    rows.push(cats.slice(i, i + 2).map((c) => ({ text: `${c.nameUz} (${c._count.requests})`, callback_data: `req:${c.slug}:0` })));
  }
  rows.push([back]);
  await show(chatId, "📂 <b>Kategoriyalar</b>\nQavs ichida — ochiq so‘rovlar soni. Kategoriyani tanlang:", rows, messageId);
}

async function requestList(chatId: number, slug: string, page: number, messageId?: number) {
  const where = {
    deletedAt: null,
    status: { in: ["VERIFIED" as const, "MATCHING" as const] },
    ...(slug !== "all" ? { category: { slug } } : {}),
  };
  const [total, items, category] = await Promise.all([
    db.request.count({ where }),
    db.request.findMany({
      where,
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, urgency: true, location: { select: { city: true } }, category: { select: { nameUz: true } } },
    }),
    slug !== "all" ? db.category.findUnique({ where: { slug }, select: { nameUz: true } }) : null,
  ]);
  const title = category ? `🆘 <b>${esc(category.nameUz)}</b> — ochiq so‘rovlar` : "🆘 <b>Ochiq yordam so‘rovlari</b>";
  if (!items.length) {
    return show(chatId, `${title}\n\nHozircha ochiq so‘rovlar yo‘q. 🙌`, [[{ text: "📂 Kategoriyalar", callback_data: "cats" }, back]], messageId);
  }
  const lines = items.map(
    (r, i) => `${page * PAGE_SIZE + i + 1}. ${URGENCY[r.urgency]?.split(" ")[0] ?? "⚪"} <b>${esc(cut(r.title, 60))}</b>\n    📂 ${esc(r.category.nameUz)}${r.location ? ` · 📍 ${esc(r.location.city)}` : ""}`,
  );
  const keyboard: Keyboard = items.map((r, i) => [{ text: `${page * PAGE_SIZE + i + 1}. ${cut(r.title, 40)}`, callback_data: `rq:${r.id}:${slug}:${page}` }]);
  keyboard.push(pager(`req:${slug}`, page, total));
  keyboard.push([{ text: "📂 Kategoriyalar", callback_data: "cats" }, back]);
  await show(chatId, `${title}\nJami: ${total}\n\n${lines.join("\n")}`, keyboard, messageId);
}

async function requestDetail(chatId: number, id: string, backTo: string, messageId?: number) {
  const r = await db.request.findFirst({
    where: { id, deletedAt: null, status: { in: ["VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"] } },
    select: {
      id: true, title: true, description: true, urgency: true, status: true, peopleCount: true, estimatedHours: true,
      preferredDate: true, createdAt: true,
      category: { select: { nameUz: true } },
      location: { select: { city: true, region: true } },
      organization: { select: { name: true } },
    },
  });
  if (!r) return show(chatId, "So‘rov topilmadi yoki yopilgan.", [[{ text: "⬅️ Orqaga", callback_data: backTo }]], messageId);
  // Exact address and phone are private — only shown on the site to the accepted volunteer.
  const text = [
    `<b>${esc(r.title)}</b>`,
    "",
    esc(cut(r.description, 700)),
    "",
    `📂 Kategoriya: ${esc(r.category.nameUz)}`,
    `⚡ Shoshilinchlik: ${URGENCY[r.urgency] ?? r.urgency}`,
    `📌 Holat: ${STATUS[r.status] ?? r.status}`,
    r.location ? `📍 Hudud: ${esc(r.location.city)}, ${esc(r.location.region)}` : null,
    `👥 Odamlar soni: ${r.peopleCount}`,
    `⏱ Taxminiy vaqt: ${r.estimatedHours} soat`,
    r.preferredDate ? `📅 Sana: ${fmtDate(r.preferredDate)}` : null,
    r.organization ? `🏢 Tashkilot: ${esc(r.organization.name)}` : null,
    `🕒 Yaratilgan: ${fmtDate(r.createdAt)}`,
  ].filter(Boolean).join("\n");
  await show(chatId, text, [[{ text: "🤝 Yordam berish", url: link(`/dashboard/requests/${r.id}`) }], [{ text: "⬅️ Orqaga", callback_data: backTo }, back]], messageId);
}

async function campaignList(chatId: number, page: number, messageId?: number) {
  const where = { deletedAt: null, status: "ACTIVE" as const };
  const [total, items] = await Promise.all([
    db.campaign.count({ where }),
    db.campaign.findMany({
      where,
      orderBy: { startsAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, organization: { select: { name: true } }, _count: { select: { participants: true } }, goalVolunteers: true },
    }),
  ]);
  if (!items.length) return show(chatId, "📣 <b>Kampaniyalar</b>\n\nHozircha faol kampaniyalar yo‘q.", [[back]], messageId);
  const lines = items.map((c, i) => `${page * PAGE_SIZE + i + 1}. <b>${esc(cut(c.title, 60))}</b>\n    🏢 ${esc(c.organization.name)} · 🙋 ${c._count.participants}/${c.goalVolunteers}`);
  const keyboard: Keyboard = items.map((c, i) => [{ text: `${page * PAGE_SIZE + i + 1}. ${cut(c.title, 40)}`, callback_data: `cp:${c.id}:${page}` }]);
  keyboard.push(pager("camp", page, total), [back]);
  await show(chatId, `📣 <b>Faol kampaniyalar</b>\nJami: ${total}\n\n${lines.join("\n")}`, keyboard, messageId);
}

async function campaignDetail(chatId: number, id: string, page: number, messageId?: number) {
  const c = await db.campaign.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, slug: true, title: true, description: true, startsAt: true, endsAt: true, goalHelps: true, goalVolunteers: true,
      organization: { select: { id: true, name: true } },
      category: { select: { nameUz: true } },
      location: { select: { city: true } },
      _count: { select: { participants: true, requests: { where: { status: "COMPLETED", deletedAt: null } } } },
    },
  });
  if (!c) return show(chatId, "Kampaniya topilmadi.", [[{ text: "⬅️ Orqaga", callback_data: `camp:${page}` }]], messageId);
  const bar = (v: number, max: number) => {
    const filled = Math.min(10, Math.round((v / Math.max(1, max)) * 10));
    return `${"▓".repeat(filled)}${"░".repeat(10 - filled)} ${v}/${max}`;
  };
  const text = [
    `📣 <b>${esc(c.title)}</b>`,
    "",
    esc(cut(c.description, 700)),
    "",
    `🏢 ${esc(c.organization.name)}`,
    c.category ? `📂 ${esc(c.category.nameUz)}` : null,
    c.location ? `📍 ${esc(c.location.city)}` : null,
    `📅 ${fmtDate(c.startsAt)}${c.endsAt ? ` — ${fmtDate(c.endsAt)}` : ""}`,
    "",
    `🙋 Ko‘ngillilar: ${bar(c._count.participants, c.goalVolunteers)}`,
    `✅ Yordamlar: ${bar(c._count.requests, c.goalHelps)}`,
  ].filter(Boolean).join("\n");
  await show(
    chatId,
    text,
    [
      [{ text: "✋ Qo‘shilish", url: link(`/campaigns/${c.slug}`) }],
      [{ text: "🏢 Tashkilot", callback_data: `og:${c.organization.id}:0` }],
      [{ text: "⬅️ Orqaga", callback_data: `camp:${page}` }, back],
    ],
    messageId,
  );
}

async function organizationList(chatId: number, page: number, messageId?: number) {
  const where = { deletedAt: null, status: "VERIFIED" as const };
  const [total, items] = await Promise.all([
    db.organization.count({ where }),
    db.organization.findMany({
      where,
      orderBy: { name: "asc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, type: true, location: { select: { city: true } } },
    }),
  ]);
  if (!items.length) return show(chatId, "🏢 <b>Tashkilotlar</b>\n\nHozircha tashkilotlar yo‘q.", [[back]], messageId);
  const lines = items.map((o, i) => `${page * PAGE_SIZE + i + 1}. <b>${esc(o.name)}</b> ✅\n    ${ORG_TYPE[o.type] ?? esc(o.type)}${o.location ? ` · 📍 ${esc(o.location.city)}` : ""}`);
  const keyboard: Keyboard = items.map((o, i) => [{ text: `${page * PAGE_SIZE + i + 1}. ${cut(o.name, 40)}`, callback_data: `og:${o.id}:${page}` }]);
  keyboard.push(pager("org", page, total), [back]);
  await show(chatId, `🏢 <b>Tasdiqlangan tashkilotlar</b>\nJami: ${total}\n\n${lines.join("\n")}`, keyboard, messageId);
}

async function organizationDetail(chatId: number, id: string, page: number, messageId?: number) {
  const o = await db.organization.findFirst({
    where: { id, deletedAt: null, status: "VERIFIED" },
    select: {
      id: true, slug: true, name: true, description: true, type: true, website: true, phone: true, email: true,
      location: { select: { city: true } },
      _count: {
        select: {
          members: { where: { status: "ACTIVE" } },
          campaigns: { where: { status: "ACTIVE", deletedAt: null } },
          requests: { where: { status: "COMPLETED", deletedAt: null } },
        },
      },
    },
  });
  if (!o) return show(chatId, "Tashkilot topilmadi.", [[{ text: "⬅️ Orqaga", callback_data: `org:${page}` }]], messageId);
  const text = [
    `🏢 <b>${esc(o.name)}</b> ✅`,
    `${ORG_TYPE[o.type] ?? esc(o.type)}${o.location ? ` · 📍 ${esc(o.location.city)}` : ""}`,
    "",
    esc(cut(o.description, 700)),
    "",
    `🙋 Ko‘ngillilar: ${o._count.members}`,
    `📣 Faol kampaniyalar: ${o._count.campaigns}`,
    `✅ Bajarilgan yordamlar: ${o._count.requests}`,
    o.phone ? `📞 ${esc(o.phone)}` : null,
    o.email ? `✉️ ${esc(o.email)}` : null,
  ].filter(Boolean).join("\n");
  const keyboard: Keyboard = [[{ text: "🌐 Sahifasi", url: link(`/organizations/${o.slug}`) }]];
  if (o.website && /^https?:\/\//.test(o.website)) keyboard.push([{ text: "🔗 Veb-sayt", url: o.website }]);
  keyboard.push([{ text: "⬅️ Orqaga", callback_data: `org:${page}` }, back]);
  await show(chatId, text, keyboard, messageId);
}

async function map(chatId: number, messageId?: number) {
  await show(
    chatId,
    "🗺 <b>Xarita</b>\n\nSo‘rovlar, ko‘ngillilar va tashkilotlarni xaritada ko‘ring. Maxfiylik uchun joylashuvlar ≈1 km aniqlikda ko‘rsatiladi.",
    [[{ text: "🗺 Xaritani ochish", url: link("/map") }], [back]],
    messageId,
  );
}

// ───────────────────────────── Routing ─────────────────────────────

type Update = {
  message?: { chat: { id: number }; from?: { first_name?: string }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number }; message_id: number } };
};

async function onText(chatId: number, text: string, name: string) {
  const [cmd, ...args] = text.trim().split(/\s+/);
  const command = cmd.split("@")[0].toLowerCase();
  switch (command) {
    case "/start": return start(chatId, name);
    case "/menu": return menu(chatId);
    case "/help": case "ℹ️": return help(chatId);
    case "/about": return about(chatId);
    case "/join": return join(chatId);
    case "/stats": case "📊": return stats(chatId);
    case "/top": case "🏆": return leaderboard(chatId);
    case "/categories": case "📂": return categories(chatId);
    case "/requests": return requestList(chatId, args[0] ?? "all", 0);
    case "🆘": return requestList(chatId, "all", 0);
    case "/campaigns": case "📣": return campaignList(chatId, 0);
    case "/organizations": case "🏢": return organizationList(chatId, 0);
    case "/map": case "🗺": return map(chatId);
  }
  if (command.startsWith("/request_")) return requestList(chatId, command.slice(9).replace(/_/g, "-"), 0);
  await api("sendMessage", { chat_id: chatId, text: "Tushunmadim 🤔 Pastdagi menyudan foydalaning yoki /help yuboring.", reply_markup: replyMenu });
}

async function onCallback(chatId: number, messageId: number, data: string) {
  const [kind, a, b, c] = data.split(":");
  const page = (v?: string) => Math.max(0, Number(v) || 0);
  switch (kind) {
    case "menu": return menu(chatId, messageId);
    case "help": return help(chatId, messageId);
    case "join": return join(chatId, messageId);
    case "stats": return stats(chatId, messageId);
    case "top": return leaderboard(chatId, messageId);
    case "cats": return categories(chatId, messageId);
    case "map": return map(chatId, messageId);
    case "req": return requestList(chatId, a ?? "all", page(b), messageId);
    case "rq": return requestDetail(chatId, a, `req:${b ?? "all"}:${page(c)}`, messageId);
    case "camp": return campaignList(chatId, page(a), messageId);
    case "cp": return campaignDetail(chatId, a, page(b), messageId);
    case "org": return organizationList(chatId, page(a), messageId);
    case "og": return organizationDetail(chatId, a, page(b), messageId);
  }
}

export async function handleUpdate(update: Update) {
  const cq = update.callback_query;
  const chatId = cq?.message?.chat.id ?? update.message?.chat.id;
  if (!chatId) return;
  try {
    if (cq) {
      await api("answerCallbackQuery", { callback_query_id: cq.id });
      if (cq.message && cq.data && cq.data !== "noop") await onCallback(chatId, cq.message.message_id, cq.data);
    } else if (update.message?.text) {
      await onText(chatId, update.message.text, update.message.from?.first_name ?? "do‘st");
    }
  } catch (err) {
    console.error("[telegram] handler error", err);
    await api("sendMessage", { chat_id: chatId, text: "Xatolik yuz berdi, birozdan so‘ng urinib ko‘ring." });
  }
}

export const BOT_COMMANDS = [
  { command: "start", description: "Boshlash" },
  { command: "menu", description: "Bosh menyu" },
  { command: "requests", description: "Ochiq yordam so‘rovlari" },
  { command: "campaigns", description: "Faol kampaniyalar" },
  { command: "organizations", description: "Tashkilotlar" },
  { command: "top", description: "Eng faol ko‘ngillilar" },
  { command: "stats", description: "Platforma statistikasi" },
  { command: "categories", description: "Kategoriyalar" },
  { command: "map", description: "Xarita" },
  { command: "join", description: "Ko‘ngilli bo‘lish" },
  { command: "about", description: "Loyiha haqida" },
  { command: "help", description: "Yordam" },
];

export async function setWebhook(url: string) {
  await api("setWebhook", { url, secret_token: env.telegram.webhookSecret || undefined, allowed_updates: ["message", "callback_query"] });
  await api("setMyCommands", { commands: BOT_COMMANDS });
}
