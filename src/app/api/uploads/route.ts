import { NextResponse } from "next/server";
import { authRoute } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { ApiError } from "@/server/http/errors";
import { uploadRequestImage } from "@/server/services/uploads";

export const POST = authRoute(
  async ({ req, user }) => {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new ApiError(422, "fileType");
    return NextResponse.json({ data: await uploadRequestImage(user.id, file) }, { status: 201 });
  },
  { rateLimit: RATE_LIMITS.upload },
);
