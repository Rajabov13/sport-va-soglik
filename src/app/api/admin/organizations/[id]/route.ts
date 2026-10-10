import { authRoute, parseJson } from "@/server/http/api";
import { adminOrgActionSchema } from "@/schemas/misc";
import { adminOrganizationAction } from "@/server/services/admin";

export const POST = authRoute<{ id: string }>(async ({ req, params, user, ip }) => {
  const { action } = await parseJson(req, adminOrgActionSchema);
  await adminOrganizationAction(user.id, params.id, action, ip);
  return { ok: true };
}, { roles: ["ADMIN"] });
