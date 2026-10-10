import { authRoute, parseJson } from "@/server/http/api";
import { adminRequestActionSchema } from "@/schemas/misc";
import { adminRequestAction } from "@/server/services/admin";

export const POST = authRoute<{ id: string }>(async ({ req, params, user, ip }) => {
  const input = await parseJson(req, adminRequestActionSchema);
  await adminRequestAction(user.id, params.id, input.action, input.note, ip);
  return { ok: true };
}, { roles: ["ADMIN"] });
