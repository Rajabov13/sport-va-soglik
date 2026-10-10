import { authRoute } from "@/server/http/api";
import { markRead } from "@/server/services/conversations";

export const POST = authRoute<{ id: string }>(async ({ params, user }) => {
  await markRead(params.id, user.id);
  return { ok: true };
});
