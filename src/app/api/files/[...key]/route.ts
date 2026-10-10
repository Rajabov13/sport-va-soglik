import { NextResponse, type NextRequest } from "next/server";
import { storage } from "@/server/storage";
import { isSafeKey } from "@/server/storage/validate";
import { getUserBySessionToken } from "@/server/auth/session";
import { SESSION_COOKIE } from "@/server/auth/constants";
import { isParticipant } from "@/server/services/conversations";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const key = (await ctx.params).key.join("/");
  if (!isSafeKey(key)) return new NextResponse(null, { status: 404 });

  // Chat attachments are private to conversation participants (and admins).
  if (key.startsWith("messages/")) {
    const user = await getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    const conversationId = key.split("/")[1];
    if (!user || (user.role !== "ADMIN" && !(await isParticipant(conversationId, user.id)))) {
      return new NextResponse(null, { status: 404 });
    }
  }

  const data = await storage().get(key);
  if (!data) return new NextResponse(null, { status: 404 });
  const ext = key.split(".").pop() ?? "";
  return new NextResponse(Buffer.from(data), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": key.startsWith("messages/") ? "private, max-age=3600" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
