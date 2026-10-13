import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { handleUpdate } from "@/server/telegram/bot";

export const dynamic = "force-dynamic";

/** Telegram webhook endpoint. Register it with `npm run telegram:webhook`. */
export async function POST(req: NextRequest) {
  if (!env.telegram.botToken) return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  if (env.telegram.webhookSecret && req.headers.get("x-telegram-bot-api-secret-token") !== env.telegram.webhookSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const update = await req.json().catch(() => null);
  if (update) await handleUpdate(update);
  return NextResponse.json({ ok: true });
}
