import { randomBytes } from "crypto";
import { db } from "@/server/db";
import { Errors } from "@/server/http/errors";
import { notify } from "./notifications";
import { storage } from "@/server/storage";
import { detectImageType } from "@/server/storage/validate";
import { env } from "@/config/env";
import { ApiError } from "@/server/http/errors";

const TYPING_WINDOW_MS = 6000;

async function requireParticipant(conversationId: string, userId: string) {
  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw Errors.forbidden();
  return participant;
}

export async function isParticipant(conversationId: string, userId: string) {
  const p = await db.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
  return !!p;
}

export async function listConversations(userId: string) {
  const parts = await db.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          request: { select: { id: true, title: true, status: true } },
          participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, where: { deletedAt: null } },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    take: 50,
  });

  return Promise.all(
    parts.map(async (p) => {
      const unread = await db.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          deletedAt: null,
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });
      const others = p.conversation.participants.filter((x) => x.userId !== userId).map((x) => x.user);
      const last = p.conversation.messages[0];
      return {
        id: p.conversationId,
        request: p.conversation.request,
        others,
        lastMessage: last ? { body: last.body, createdAt: last.createdAt, senderId: last.senderId } : null,
        lastMessageAt: p.conversation.lastMessageAt,
        unread,
      };
    }),
  );
}

export async function unreadMessageCount(userId: string) {
  const parts = await db.conversationParticipant.findMany({ where: { userId }, select: { conversationId: true, lastReadAt: true } });
  const counts = await Promise.all(
    parts.map((p) =>
      db.message.count({
        where: { conversationId: p.conversationId, senderId: { not: userId }, deletedAt: null, ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}) },
      }),
    ),
  );
  return counts.reduce((a, b) => a + b, 0);
}

/** Messages page. `after` enables cheap polling for new messages (WebSocket/SSE-ready contract). */
export async function getMessages(conversationId: string, userId: string, opts: { after?: string; before?: string; limit?: number }) {
  await requireParticipant(conversationId, userId);
  const limit = Math.min(opts.limit ?? 50, 100);
  const createdAt = opts.after ? { gt: new Date(opts.after) } : opts.before ? { lt: new Date(opts.before) } : undefined;
  const rows = await db.message.findMany({
    where: { conversationId, deletedAt: null, ...(createdAt ? { createdAt } : {}) },
    orderBy: { createdAt: opts.after ? "asc" : "desc" },
    take: limit,
    include: { attachments: true, sender: { select: { id: true, name: true, avatarUrl: true } } },
  });
  const messages = opts.after ? rows : rows.reverse();

  const others = await db.conversationParticipant.findMany({
    where: { conversationId, userId: { not: userId } },
    include: { user: { select: { id: true, name: true } } },
  });
  const typing = others.filter((o) => o.typingAt && Date.now() - o.typingAt.getTime() < TYPING_WINDOW_MS).map((o) => o.user.name);
  const readBy = others.map((o) => ({ userId: o.userId, lastReadAt: o.lastReadAt }));

  return {
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      sender: m.sender,
      attachments: m.attachments.map((a) => ({ id: a.id, url: a.url, mimeType: a.mimeType })),
    })),
    typing,
    readBy,
    hasMore: !opts.after && rows.length === limit,
  };
}

async function afterMessage(conversationId: string, senderId: string, preview: string) {
  await db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: senderId } },
    data: { lastReadAt: new Date(), typingAt: null },
  });
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true, request: { select: { title: true } } },
  });
  const sender = await db.user.findUnique({ where: { id: senderId }, select: { name: true } });
  for (const p of conversation?.participants ?? []) {
    if (p.userId === senderId) continue;
    // Throttle: one unread NEW_MESSAGE notification per conversation at a time.
    const pending = await db.notification.count({
      where: { userId: p.userId, type: "NEW_MESSAGE", readAt: null, link: `/dashboard/messages?c=${conversationId}` },
    });
    if (pending === 0) {
      await notify(
        p.userId,
        "NEW_MESSAGE",
        { from: sender?.name ?? "", title: conversation?.request?.title ?? "", preview: preview.slice(0, 80) },
        `/dashboard/messages?c=${conversationId}`,
      );
    }
  }
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  await requireParticipant(conversationId, senderId);
  const message = await db.message.create({
    data: { conversationId, senderId, body },
    include: { attachments: true, sender: { select: { id: true, name: true, avatarUrl: true } } },
  });
  await afterMessage(conversationId, senderId, body);
  return message;
}

export async function sendAttachment(conversationId: string, senderId: string, file: File, caption: string) {
  await requireParticipant(conversationId, senderId);
  if (file.size > env.storage.maxFileBytes) throw new ApiError(413, "fileTooLarge");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new ApiError(415, "fileType");
  const key = `messages/${conversationId}/${randomBytes(12).toString("hex")}.${type.ext}`;
  const { url } = await storage().put(key, bytes, type.mime);
  const message = await db.message.create({
    data: {
      conversationId,
      senderId,
      body: caption.slice(0, 2000),
      attachments: { create: { url, storageKey: key, mimeType: type.mime, size: bytes.length } },
    },
    include: { attachments: true, sender: { select: { id: true, name: true, avatarUrl: true } } },
  });
  await afterMessage(conversationId, senderId, caption || "📷");
  return message;
}

export async function markRead(conversationId: string, userId: string) {
  await requireParticipant(conversationId, userId);
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
  await db.notification.updateMany({
    where: { userId, type: "NEW_MESSAGE", readAt: null, link: `/dashboard/messages?c=${conversationId}` },
    data: { readAt: new Date() },
  });
}

export async function setTyping(conversationId: string, userId: string) {
  await requireParticipant(conversationId, userId);
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { typingAt: new Date() },
  });
}
