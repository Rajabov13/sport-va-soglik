import { db } from "@/server/db";
import { env } from "@/config/env";
import { getPublicImpactStats } from "@/server/services/stats";

/** Minimal Telegram Bot API client — no extra dependency, works on serverless. */
async function api(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${env.telegram.botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`[telegram] ${method} failed`, res.status, await res.text());
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

const URGENCY: Record<string, string> = { LOW: "🟢", MEDIUM: "🟡", HIGH: "🟠", CRITICAL: "🔴" };

const mainKeyboard = {
  keyboard: [[{ text: "🆘 Ochiq so‘rovlar" }, { text: "📊 Statistika" }], [{ text: "📂 Kategoriyalar" }, { text: "ℹ️ Yordam" }]],
  resize_keyboard: true,
};

function send(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  return api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: mainKeyboard, ...extra });
}

async function start(chatId: number, name: string) {
  await send(
    chatId,
    `Assalomu alaykum, <b>${esc(name)}</b>! 👋\n\n<b>QO‘LLAB</b> — <i>Yaxshilikni birlashtiramiz.</i>\n\nBu bot orqali yordam so‘rovlarini ko‘rishingiz, platforma statistikasini bilishingiz va ko‘ngilli bo‘lishingiz mumkin.`,
    { reply_markup: { ...mainKeyboard }, },
  );
  await api("sendMessage", {
    chat_id: chatId,
    text: "Platformaga o‘tish:",
    reply_markup: { inline_keyboard: [[{ text: "🌐 Saytni ochish", url: env.appUrl }], [{ text: "🙋 Ko‘ngilli bo‘lish", url: `${env.appUrl}/auth/register` }]] },
  });
}

async function help(chatId: number) {
  await send(
    chatId,
    "<b>Buyruqlar:</b>\n/start — boshlash\n/requests — ochiq yordam so‘rovlari\n/request <code>kategoriya</code> — kategoriya bo‘yicha\n/stats — platforma statistikasi\n/categories — kategoriyalar\n/help — yordam",
  );
}

async function stats(chatId: number) {
  const s = await getPublicImpactStats();
  await send(
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
    ].join("\n"),
  );
}

async function categories(chatId: number) {
  const cats = await db.category.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" }, select: { slug: true, nameUz: true } });
  if (!cats.length) return send(chatId, "Kategoriyalar topilmadi.");
  await send(chatId, "📂 <b>Kategoriyalar</b>\n\n" + cats.map((c) => `• ${esc(c.nameUz)} — /request_${c.slug.replace(/-/g, "_")}`).join("\n"));
}

async function requests(chatId: number, categorySlug?: string) {
  const items = await db.request.findMany({
    where: {
      deletedAt: null,
      status: { in: ["VERIFIED", "MATCHING"] },
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    take: 5,
    select: { id: true, title: true, urgency: true, address: true, category: { select: { nameUz: true } } },
  });
  if (!items.length) return send(chatId, "Hozircha ochiq so‘rovlar yo‘q. 🙌");
  for (const r of items) {
    await api("sendMessage", {
      chat_id: chatId,
      parse_mode: "HTML",
      text: `${URGENCY[r.urgency] ?? "⚪"} <b>${esc(r.title)}</b>\n📂 ${esc(r.category.nameUz)}\n📍 ${esc(r.address)}`,
      reply_markup: { inline_keyboard: [[{ text: "🤝 Yordam berish", url: `${env.appUrl}/dashboard/requests/${r.id}` }]] },
    });
  }
}

type Update = { message?: { chat: { id: number }; from?: { first_name?: string }; text?: string } };

export async function handleUpdate(update: Update) {
  const msg = update.message;
  if (!msg?.text) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const [cmd, ...args] = text.split(/\s+/);
  const command = cmd.split("@")[0].toLowerCase();

  try {
    if (command === "/start") return await start(chatId, msg.from?.first_name ?? "do‘st");
    if (command === "/help" || text === "ℹ️ Yordam") return await help(chatId);
    if (command === "/stats" || text === "📊 Statistika") return await stats(chatId);
    if (command === "/categories" || text === "📂 Kategoriyalar") return await categories(chatId);
    if (command === "/requests" || text === "🆘 Ochiq so‘rovlar") return await requests(chatId);
    if (command === "/request") return await requests(chatId, args[0]);
    if (command.startsWith("/request_")) return await requests(chatId, command.slice(9).replace(/_/g, "-"));
    await send(chatId, "Tushunmadim 🤔 /help buyrug‘ini yuboring.");
  } catch (err) {
    console.error("[telegram] handler error", err);
    await send(chatId, "Xatolik yuz berdi, birozdan so‘ng urinib ko‘ring.");
  }
}

export async function setWebhook(url: string) {
  await api("setWebhook", { url, secret_token: env.telegram.webhookSecret || undefined, allowed_updates: ["message"] });
  await api("setMyCommands", {
    commands: [
      { command: "start", description: "Boshlash" },
      { command: "requests", description: "Ochiq yordam so‘rovlari" },
      { command: "stats", description: "Platforma statistikasi" },
      { command: "categories", description: "Kategoriyalar" },
      { command: "help", description: "Yordam" },
    ],
  });
}
