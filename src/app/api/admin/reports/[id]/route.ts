import { authRoute, parseJson } from "@/server/http/api";
import { adminReportActionSchema } from "@/schemas/misc";
import { adminReportAction } from "@/server/services/admin";

export const POST = authRoute<{ id: string }>(async ({ req, params, user, ip }) => {
  await adminReportAction(user.id, params.id, await parseJson(req, adminReportActionSchema), ip);
  return { ok: true };
}, { roles: ["ADMIN"] });
