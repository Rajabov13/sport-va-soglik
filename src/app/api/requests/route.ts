import { NextResponse } from "next/server";
import { authRoute, parseJson, parseQuery } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { createRequestSchema, requestListQuerySchema } from "@/schemas/request";
import { createRequest, listRequests } from "@/server/services/requests";

export const GET = authRoute(async ({ req, user }) => listRequests(user, parseQuery(req, requestListQuerySchema)));

export const POST = authRoute(
  async ({ req, user }) => {
    const input = await parseJson(req, createRequestSchema);
    return NextResponse.json({ data: await createRequest(user, input) }, { status: 201 });
  },
  { rateLimit: RATE_LIMITS.createRequest },
);
