import { authRoute, parseJson } from "@/server/http/api";
import { adminUserActionSchema } from "@/schemas/misc";
import { adminUserAction } from "@/server/services/admin";

export const POST = authRoute<{ id: string }>(async ({ req, params, user, ip }) => {
  const input = await parseJson(req, adminUserActionSchema);
  await adminUserAction(user.id, params.id, input.action, { role: input.role, reason: input.reason, ip });
  return { ok: true };
}, { roles: ["ADMIN"] });
