import { NextResponse } from "next/server";
import { authRoute } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { ApiError } from "@/server/http/errors";
import { sendAttachment } from "@/server/services/conversations";

export const POST = authRoute<{ id: string }>(
  async ({ req, params, user }) => {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    const caption = String(form?.get("caption") ?? "");
    if (!(file instanceof File)) throw new ApiError(422, "fileType");
    return NextResponse.json({ data: await sendAttachment(params.id, user.id, file, caption) }, { status: 201 });
  },
  { rateLimit: RATE_LIMITS.upload },
);
