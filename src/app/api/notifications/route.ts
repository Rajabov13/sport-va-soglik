import { z } from "zod";
import { authRoute, parseJson, parseQuery } from "@/server/http/api";
import { paginationSchema } from "@/schemas/common";
import { listNotifications, markNotificationsRead } from "@/server/services/notifications";

const querySchema = paginationSchema.extend({ unread: z.enum(["1", "0"]).optional() });
const markSchema = z.object({ ids: z.array(z.string().max(64)).max(100).optional() });

export const GET = authRoute(async ({ req, user }) => {
  const q = parseQuery(req, querySchema);
  return listNotifications(user.id, { page: q.page, pageSize: q.pageSize, unreadOnly: q.unread === "1" });
});

export const POST = authRoute(async ({ req, user }) => {
  const { ids } = await parseJson(req, markSchema);
  await markNotificationsRead(user.id, ids);
  return { ok: true };
});
