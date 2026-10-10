import { authRoute, parseJson } from "@/server/http/api";
import { memberActionSchema } from "@/schemas/misc";
import { updateMember } from "@/server/services/organizations";

export const POST = authRoute<{ id: string }>(async ({ req, params, user }) => {
  const { action } = await parseJson(req, memberActionSchema);
  await updateMember(user.id, params.id, action);
  return { ok: true };
}, { roles: ["ORGANIZATION"] });
