import { authRoute } from "@/server/http/api";
import { db } from "@/server/db";
import { unreadMessageCount } from "@/server/services/conversations";

/** Lightweight badge counts, polled by the app shell. */
export const GET = authRoute(async ({ user }) => {
  const [notifications, messages] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    unreadMessageCount(user.id),
  ]);
  return { notifications, messages };
});
