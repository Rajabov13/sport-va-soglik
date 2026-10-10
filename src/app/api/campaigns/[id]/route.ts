import { z } from "zod";
import { authRoute, parseJson, publicRoute } from "@/server/http/api";
import { getCampaign, setCampaignStatus } from "@/server/services/organizations";

export const GET = publicRoute<{ id: string }>(async ({ params }) => getCampaign(params.id));

export const PATCH = authRoute<{ id: string }>(async ({ req, params, user }) => {
  const { status } = await parseJson(req, z.object({ status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]) }));
  await setCampaignStatus(user.id, params.id, status);
  return { ok: true };
}, { roles: ["ORGANIZATION"] });
