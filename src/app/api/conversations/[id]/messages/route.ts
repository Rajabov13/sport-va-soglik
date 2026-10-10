import { NextResponse } from "next/server";
import { z } from "zod";
import { authRoute, parseJson } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { getMessages, sendMessage } from "@/server/services/conversations";

const bodySchema = z.object({ body: z.string().trim().min(1, "required").max(2000, "tooLong") });

export const GET = authRoute<{ id: string }>(async ({ req, params, user }) => {
  const sp = req.nextUrl.searchParams;
  const valid = (v: string | null) => (v && !Number.isNaN(Date.parse(v)) ? v : undefined);
  return getMessages(params.id, user.id, { after: valid(sp.get("after")), before: valid(sp.get("before")) });
});

export const POST = authRoute<{ id: string }>(
  async ({ req, params, user }) => {
    const { body } = await parseJson(req, bodySchema);
    return NextResponse.json({ data: await sendMessage(params.id, user.id, body) }, { status: 201 });
  },
  { rateLimit: RATE_LIMITS.message },
);
