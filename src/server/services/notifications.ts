import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email";
import { translatorFor } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { tDynamic } from "@/i18n/translate";
import { env } from "@/config/env";

export type NotificationData = Record<string, string | number>;

/** Types that are also delivered by email (if the user opted in). */
const EMAIL_TYPES: NotificationType[] = ["REQUEST_ACCEPTED", "REQUEST_COMPLETED", "COMPLETION_REQUESTED", "NEW_MATCH", "REQUEST_MODERATED"];

export async function notify(userId: string, type: NotificationType, data: NotificationData, link?: string) {
  const notification = await db.notification.create({
    data: { userId, type, data: data as Prisma.InputJsonValue, link },
  });

  if (EMAIL_TYPES.includes(type)) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, locale: true, isDemo: true, profile: { select: { emailNotifications: true } } },
    });
    if (user && !user.isDemo && user.profile?.emailNotifications !== false) {
      const t = translatorFor(isLocale(user.locale) ? user.locale : "uz");
      const title = tDynamic(t, `notifications.types.${type}.title`, data);
      const body = tDynamic(t, `notifications.types.${type}.body`, data);
      await sendEmail({ to: user.email, subject: `QO‘LLAB — ${title}`, text: `${body}\n\n${env.appUrl}${link ?? "/dashboard"}` });
    }
  }
  return notification;
}

export async function notifyMany(userIds: string[], type: NotificationType, data: NotificationData, link?: string) {
  await Promise.all(userIds.map((id) => notify(id, type, data, link)));
}

export async function listNotifications(userId: string, opts: { page: number; pageSize: number; unreadOnly?: boolean }) {
  const where: Prisma.NotificationWhereInput = { userId, ...(opts.unreadOnly ? { readAt: null } : {}) };
  const [items, total, unread] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, total, unread, page: opts.page, pageSize: opts.pageSize, totalPages: Math.max(1, Math.ceil(total / opts.pageSize)) };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await db.notification.updateMany({
    where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
}
