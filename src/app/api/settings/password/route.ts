import { NextResponse } from "next/server";
import { authRoute, parseJson } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { changePasswordSchema } from "@/schemas/auth";
import { changePassword } from "@/server/services/users";
import { withSession } from "@/server/auth/respond";

export const PUT = authRoute(
  async ({ req, user }) => {
    await changePassword(user.id, await parseJson(req, changePasswordSchema));
    // All sessions were revoked; issue a fresh one for this device.
    return withSession(req, user.id, NextResponse.json({ data: { ok: true } }));
  },
  { rateLimit: RATE_LIMITS.auth },
);
