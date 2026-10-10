import { NextResponse } from "next/server";
import { authRoute, parseJson } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { reportSchema } from "@/schemas/misc";
import { createReport } from "@/server/services/reports";

export const POST = authRoute(
  async ({ req, user }) => {
    const report = await createReport(user.id, await parseJson(req, reportSchema));
    return NextResponse.json({ data: { id: report.id } }, { status: 201 });
  },
  { rateLimit: RATE_LIMITS.report },
);
