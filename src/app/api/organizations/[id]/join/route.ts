import { authRoute } from "@/server/http/api";
import { joinOrganization } from "@/server/services/organizations";

export const POST = authRoute<{ id: string }>(async ({ params, user }) => {
  const m = await joinOrganization(user.id, params.id);
  return { status: m.status };
}, { roles: ["VOLUNTEER"] });
