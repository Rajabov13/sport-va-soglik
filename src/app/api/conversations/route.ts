import { authRoute } from "@/server/http/api";
import { listConversations } from "@/server/services/conversations";

export const GET = authRoute(async ({ user }) => listConversations(user.id));
