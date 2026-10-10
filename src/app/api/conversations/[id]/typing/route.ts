import { authRoute } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { setTyping } from "@/server/services/conversations";

export const POST = authRoute<{ id: string }>(
  async ({ params, user }) => {
    await setTyping(params.id, user.id);
    return { ok: true };
  },
  { rateLimit: { ...RATE_LIMITS.message, name: "typing", limit: 120 } },
);
