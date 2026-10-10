import { db } from "@/server/db";
import { Errors } from "@/server/http/errors";
import type { ReportInput } from "@/schemas/misc";
import { isParticipant } from "./conversations";

/** File a report. Target existence and (for conversations/messages) participation are verified server-side. */
export async function createReport(reporterId: string, input: ReportInput) {
  const data: { requestId?: string; reportedUserId?: string; conversationId?: string; messageId?: string } = {};
  switch (input.targetType) {
    case "REQUEST": {
      const r = await db.request.findFirst({ where: { id: input.targetId, deletedAt: null } });
      if (!r) throw Errors.notFound();
      data.requestId = r.id;
      data.reportedUserId = r.requesterId;
      break;
    }
    case "USER": {
      const u = await db.user.findFirst({ where: { id: input.targetId, deletedAt: null } });
      if (!u) throw Errors.notFound();
      if (u.id === reporterId) throw Errors.validation();
      data.reportedUserId = u.id;
      break;
    }
    case "CONVERSATION": {
      if (!(await isParticipant(input.targetId, reporterId))) throw Errors.forbidden();
      const other = await db.conversationParticipant.findFirst({ where: { conversationId: input.targetId, userId: { not: reporterId } } });
      data.conversationId = input.targetId;
      data.reportedUserId = other?.userId;
      break;
    }
    case "MESSAGE": {
      const m = await db.message.findFirst({ where: { id: input.targetId, deletedAt: null } });
      if (!m || !(await isParticipant(m.conversationId, reporterId))) throw Errors.forbidden();
      data.messageId = m.id;
      data.conversationId = m.conversationId;
      data.reportedUserId = m.senderId;
      break;
    }
  }
  return db.report.create({
    data: { reporterId, targetType: input.targetType, reason: input.reason, details: input.details ?? null, ...data },
  });
}
