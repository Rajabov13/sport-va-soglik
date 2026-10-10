import { publicRoute } from "@/server/http/api";
import { getMe } from "@/server/services/users";

export const GET = publicRoute(async ({ user }) => (user ? getMe(user.id) : null));
