import { authRoute } from "@/server/http/api";
import { joinCampaign, leaveCampaign } from "@/server/services/organizations";

export const POST = authRoute<{ id: string }>(async ({ params, user }) => {
  await joinCampaign(user.id, params.id);
  return { joined: true };
}, { roles: ["VOLUNTEER"] });

export const DELETE = authRoute<{ id: string }>(async ({ params, user }) => {
  await leaveCampaign(user.id, params.id);
  return { joined: false };
}, { roles: ["VOLUNTEER"] });
