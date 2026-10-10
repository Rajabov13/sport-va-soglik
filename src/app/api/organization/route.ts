import { authRoute, parseJson } from "@/server/http/api";
import { organizationUpdateSchema } from "@/schemas/misc";
import { getOrganizationDashboard, updateOrganization } from "@/server/services/organizations";

export const GET = authRoute(async ({ user }) => getOrganizationDashboard(user.id), { roles: ["ORGANIZATION"] });

export const PUT = authRoute(async ({ req, user }) => {
  await updateOrganization(user.id, await parseJson(req, organizationUpdateSchema));
  return { ok: true };
}, { roles: ["ORGANIZATION"] });
