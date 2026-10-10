import { NextResponse } from "next/server";
import { z } from "zod";
import { authRoute, parseJson, parseQuery, publicRoute } from "@/server/http/api";
import { paginationSchema } from "@/schemas/common";
import { campaignSchema } from "@/schemas/misc";
import { createCampaign, listCampaigns } from "@/server/services/organizations";

const schema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
  organizationId: z.string().max(64).optional(),
});

export const GET = publicRoute(async ({ req }) => listCampaigns(parseQuery(req, schema)));

export const POST = authRoute(async ({ req, user }) => {
  const campaign = await createCampaign(user.id, await parseJson(req, campaignSchema));
  return NextResponse.json({ data: campaign }, { status: 201 });
}, { roles: ["ORGANIZATION"] });
